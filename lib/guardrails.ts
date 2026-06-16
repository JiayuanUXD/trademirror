import { and, eq, gte } from "drizzle-orm";
import dayjs from "dayjs";
import { db } from "./db/index";
import { decisions, holdings, settings, guardrailEvents } from "./db/schema";
import { getLatestState } from "./db/queries/sentiment";
import { capsFromSettings, thresholdsFromSettings } from "./sentiment/stage";

type DbOrTx = Pick<typeof db, "select" | "insert" | "update" | "delete">;

export type GuardrailEventType =
  | "ADD_TO_LOSS"
  | "OVER_SINGLE_POS"
  | "OVER_TOTAL_POS"
  | "OVER_DAILY_COUNT"
  | "MISSING_STOP";

export type GuardrailHit = {
  type: GuardrailEventType;
  blocking: boolean;       // true = 必须二次确认 / 直接拒绝；false = 仅警告
  title: string;
  message: string;
  detail: string;
};

export type GuardrailInput = {
  userId: string;
  action: "BUY" | "ADD" | "SELL" | "REDUCE" | "CLEAR";
  stockCode: string;
  price: number;
  quantity: number;
  stopLossPrice: number;       // 卖出单为 0
};

type Position = { shares: number; costPrice: number };

function computePositionForStock(
  rows: { action: string; price: number; quantity: number; status: string; createdAt: number }[]
): Position {
  const valid = rows
    .filter((d) => d.status !== "VOIDED")
    .sort((a, b) => a.createdAt - b.createdAt);
  let shares = 0;
  let totalInvested = 0;
  for (const d of valid) {
    if (d.action === "BUY" || d.action === "ADD") {
      totalInvested += d.price * d.quantity;
      shares += d.quantity;
    } else if (d.action === "SELL" || d.action === "REDUCE") {
      const sold = Math.min(d.quantity, shares);
      if (shares > 0) totalInvested = Math.max(0, totalInvested - (totalInvested / shares) * sold);
      shares = Math.max(0, shares - sold);
    } else if (d.action === "CLEAR") {
      shares = 0;
      totalInvested = 0;
    }
  }
  return {
    shares,
    costPrice: shares > 0 ? totalInvested / shares : 0,
  };
}

async function getUserSettings(tx: DbOrTx, userId: string) {
  const rows = await tx.select().from(settings).where(eq(settings.userId, userId)).limit(1);
  return rows[0] ?? null;
}

async function getCurrentPosition(tx: DbOrTx, userId: string, stockCode: string): Promise<Position> {
  const rows = await tx
    .select({
      action: decisions.action,
      price: decisions.price,
      quantity: decisions.quantity,
      status: decisions.status,
      createdAt: decisions.createdAt,
    })
    .from(decisions)
    .where(and(eq(decisions.userId, userId), eq(decisions.stockCode, stockCode)));
  return computePositionForStock(rows);
}

async function getCurrentMarketPrice(tx: DbOrTx, userId: string, stockCode: string): Promise<number | null> {
  const rows = await tx
    .select({ currentPrice: holdings.currentPrice })
    .from(holdings)
    .where(and(eq(holdings.userId, userId), eq(holdings.stockCode, stockCode)))
    .limit(1);
  return rows[0]?.currentPrice ?? null;
}

async function getHoldingsTotalCost(tx: DbOrTx, userId: string): Promise<number> {
  const rows = await tx
    .select({
      costPrice: holdings.costPrice,
      shares: holdings.shares,
    })
    .from(holdings)
    .where(and(eq(holdings.userId, userId), eq(holdings.status, "HOLDING")));
  let total = 0;
  for (const r of rows) {
    total += r.costPrice * r.shares;
  }
  return total;
}

async function getStagePositionCap(
  settingsRow: typeof settings.$inferSelect | null,
): Promise<number | null> {
  if (!settingsRow) return null;
  const caps = capsFromSettings(settingsRow);
  const thresholds = thresholdsFromSettings(settingsRow);
  const state = await getLatestState(caps, thresholds);
  return state?.positionCap ?? null;
}

async function getTodayOpenCount(tx: DbOrTx, userId: string): Promise<number> {
  const dayStart = dayjs().startOf("day").valueOf();
  const rows = await tx
    .select({ id: decisions.id })
    .from(decisions)
    .where(
      and(
        eq(decisions.userId, userId),
        eq(decisions.status, "ACTIVE"),
        gte(decisions.createdAt, dayStart),
      )
    );
  return rows.length;
}

export async function checkGuardrails(input: GuardrailInput): Promise<GuardrailHit[]> {
  const isOpen = input.action === "BUY" || input.action === "ADD";
  if (!isOpen) return [];

  const hits: GuardrailHit[] = [];

  // 1. 必填止损（纯输入校验，不需要 DB）
  if (!input.stopLossPrice || input.stopLossPrice <= 0) {
    hits.push({
      type: "MISSING_STOP",
      blocking: true,
      title: "未设置盘前止损价",
      message: "开仓前必须明确止损位，否则禁止保存。",
      detail: "止损价是控制单笔亏损的唯一硬约束。",
    });
  }

  // 所有 DB 读取在同一个事务内完成，防止并发提交绕过仓位上限
  const dbHits = await db.transaction(async (tx) => {
    const txHits: GuardrailHit[] = [];

    const settingsRow = await getUserSettings(tx, input.userId);
    const totalCapital = settingsRow?.totalCapital ?? 0;
    const maxSinglePct = (settingsRow?.maxPositionPct ?? 25) / 100;
    const dailyOpenLimit = settingsRow?.dailyOpenLimit ?? 2;

    // 2. 禁止补亏损
    if (input.action === "ADD") {
      const pos = await getCurrentPosition(tx, input.userId, input.stockCode);
      if (pos.shares > 0) {
        const reference = (await getCurrentMarketPrice(tx, input.userId, input.stockCode)) ?? input.price;
        if (reference > 0 && reference < pos.costPrice) {
          const lossPct = ((pos.costPrice - reference) / pos.costPrice) * 100;
          txHits.push({
            type: "ADD_TO_LOSS",
            blocking: true,
            title: "禁止向下补亏损头寸",
            message: "你正对一只已亏损的持仓做同向加仓——这是过去最致命的模式。",
            detail: `当前成本 ¥${pos.costPrice.toFixed(2)} / 参考价 ¥${reference.toFixed(2)}，浮亏 ${lossPct.toFixed(1)}%。`,
          });
        }
      }
    }

    // 3. 单票仓位上限
    if (totalCapital > 0) {
      const pos = await getCurrentPosition(tx, input.userId, input.stockCode);
      const newAmount = pos.shares * pos.costPrice + input.price * input.quantity;
      const newPct = newAmount / totalCapital;
      if (newPct > maxSinglePct) {
        txHits.push({
          type: "OVER_SINGLE_POS",
          blocking: true,
          title: "单票仓位超过个人上限",
          message: `本笔加仓后该股将占总资金 ${(newPct * 100).toFixed(1)}%，超过你设置的上限 ${(maxSinglePct * 100).toFixed(0)}%。`,
          detail: "在设置中调整上限，或减少本笔数量。",
        });
      }
    }

    // 4. 总仓位 + 当日阶段 cap
    const stageCap = await getStagePositionCap(settingsRow);
    if (totalCapital > 0 && stageCap != null) {
      const totalAfter = (await getHoldingsTotalCost(tx, input.userId)) + input.price * input.quantity;
      const totalPct = totalAfter / totalCapital;
      if (totalPct > stageCap) {
        txHits.push({
          type: "OVER_TOTAL_POS",
          blocking: false,
          title: "总仓位将突破当日阶段上限",
          message: `本笔后总仓位约 ${(totalPct * 100).toFixed(0)}%（按持仓档案合计），当前阶段上限 ${(stageCap * 100).toFixed(0)}%。`,
          detail: "环境不对的时候多一分仓位都是漏。请二次确认。",
        });
      }
    }

    // 5. 当日开仓笔数
    const todayCount = await getTodayOpenCount(tx, input.userId);
    if (todayCount + 1 > dailyOpenLimit) {
      txHits.push({
        type: "OVER_DAILY_COUNT",
        blocking: false,
        title: "当日开仓笔数偏多",
        message: `今天已开仓 ${todayCount} 笔，本笔将达到 ${todayCount + 1} 笔（上限 ${dailyOpenLimit}）。`,
        detail: "频繁交易是手痒的最常见外显，确认是真有机会、不是闲不住。",
      });
    }

    return txHits;
  });

  return [...hits, ...dbHits];
}

export async function logGuardrailEvent(
  userId: string,
  hit: GuardrailHit,
  outcome: "BLOCKED" | "WARNED" | "OVERRIDDEN",
  decisionRef: string | null,
  payload: Record<string, unknown> = {}
): Promise<void> {
  await db.insert(guardrailEvents).values({
    id: crypto.randomUUID(),
    userId,
    eventType: hit.type,
    decisionRef,
    payload: JSON.stringify({ title: hit.title, message: hit.message, detail: hit.detail, ...payload }),
    outcome,
    createdAt: Date.now(),
  });
}
