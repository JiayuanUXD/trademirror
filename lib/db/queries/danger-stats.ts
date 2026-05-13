import { and, desc, eq, gte, isNotNull, lt, lte } from "drizzle-orm";
import dayjs from "dayjs";
import { db } from "../index";
import { decisions } from "../schema";

export type FomoStats = {
  total: number;
  losses: number;
  lossRate: number;
};

export type CalmStats = FomoStats;

export type NotAlignStats = {
  total: number;
  losses: number;
};

export type RecentDecisionInfo = {
  id: string;
  stockName: string;
  createdAt: number;
  minutesAgo: number;
};

/**
 * 统计历史上 FOMO ≥ 7 的已完成交易（有 30 天回报）中亏损的占比。
 * 用于决策卡提交前展示"你过去 X 次类似冲动，Y 次亏损"。
 */
export async function getFomoStats(): Promise<FomoStats> {
  const rows = await db
    .select({ ret: decisions.return30Days })
    .from(decisions)
    .where(
      and(
        gte(decisions.fomoScore, 7),
        isNotNull(decisions.return30Days),
        eq(decisions.isArchived, false)
      )
    );

  const total = rows.length;
  const losses = rows.filter((r) => (r.ret ?? 0) < 0).length;
  const lossRate = total === 0 ? 0 : losses / total;
  return { total, losses, lossRate };
}

/** 历史上 平静度 ≤ 4 的已完成交易亏损情况。 */
export async function getCalmStats(): Promise<CalmStats> {
  const rows = await db
    .select({ ret: decisions.return30Days })
    .from(decisions)
    .where(
      and(
        lte(decisions.calmScore, 4),
        isNotNull(decisions.return30Days),
        eq(decisions.isArchived, false)
      )
    );

  const total = rows.length;
  const losses = rows.filter((r) => (r.ret ?? 0) < 0).length;
  const lossRate = total === 0 ? 0 : losses / total;
  return { total, losses, lossRate };
}

/**
 * 本月已发生的"不符合体系"操作笔数 + 其中已有亏损结果的笔数。
 * 注意：这里的 losses 仅统计 return_30_days < 0 的，刚发生还没回填的不计。
 */
export async function getNotAlignThisMonth(): Promise<NotAlignStats> {
  const monthStart = dayjs().startOf("month").valueOf();
  const monthEnd = dayjs().endOf("month").valueOf();

  const rows = await db
    .select({ ret: decisions.return30Days })
    .from(decisions)
    .where(
      and(
        eq(decisions.systemAlignment, "NOT_ALIGN"),
        gte(decisions.createdAt, monthStart),
        lte(decisions.createdAt, monthEnd),
        eq(decisions.isArchived, false)
      )
    );

  const total = rows.length;
  const losses = rows.filter((r) => (r.ret ?? 0) < 0).length;
  return { total, losses };
}

/**
 * 查最近一笔决策（不含当前正在创建的），用于判断"频繁操作"。
 * 返回 null 表示从未交易过。
 */
export async function getMostRecentDecision(
  beforeTs: number = Date.now()
): Promise<RecentDecisionInfo | null> {
  const rows = await db
    .select({
      id: decisions.id,
      stockName: decisions.stockName,
      createdAt: decisions.createdAt,
    })
    .from(decisions)
    .where(
      and(
        eq(decisions.isArchived, false),
        lt(decisions.createdAt, beforeTs)
      )
    )
    .orderBy(desc(decisions.createdAt))
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  return {
    id: row.id,
    stockName: row.stockName,
    createdAt: row.createdAt,
    minutesAgo: Math.floor((beforeTs - row.createdAt) / 60_000),
  };
}
