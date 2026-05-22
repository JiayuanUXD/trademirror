import { and, desc, eq } from "drizzle-orm";
import { db } from "../index";
import { decisions } from "../schema";
import type { Decision, DangerSignal, DecisionBasis, VoidedReason } from "@/types/decision";

function rowToDecision(row: typeof decisions.$inferSelect): Decision {
  return {
    ...row,
    basis: JSON.parse(row.basis) as DecisionBasis[],
    dangerSignals: JSON.parse(row.dangerSignals) as DangerSignal[],
    status: row.status as "ACTIVE" | "VOIDED" | "ARCHIVED",
    voidedReason: (row.voidedReason ?? null) as VoidedReason | null,
    voidedAt: row.voidedAt ?? null,
    parentId: row.parentId ?? null,
    incomplete: row.incomplete === 1,
  };
}

export async function getDecisions(
  userId: string,
  opts?: { status?: "ACTIVE" | "VOIDED" | "ARCHIVED" | "ALL"; limit?: number }
): Promise<Decision[]> {
  const limit = opts?.limit ?? 50;
  const conditions = [eq(decisions.userId, userId)];

  if (opts?.status && opts.status !== "ALL") {
    conditions.push(eq(decisions.status, opts.status));
  }

  const rows = await db
    .select()
    .from(decisions)
    .where(and(...conditions))
    .orderBy(desc(decisions.createdAt))
    .limit(limit);
  return rows.map(rowToDecision);
}

export async function getDecisionsByStockCode(stockCode: string, userId: string): Promise<Decision[]> {
  const rows = await db
    .select()
    .from(decisions)
    .where(and(eq(decisions.stockCode, stockCode), eq(decisions.userId, userId)))
    .orderBy(desc(decisions.createdAt));
  return rows.map(rowToDecision);
}

export async function getDecisionById(id: string, userId: string): Promise<Decision | null> {
  const rows = await db
    .select()
    .from(decisions)
    .where(and(eq(decisions.id, id), eq(decisions.userId, userId)))
    .limit(1);
  return rows[0] ? rowToDecision(rows[0]) : null;
}

export type InsertDecision = Omit<
  typeof decisions.$inferInsert,
  "basis" | "dangerSignals" | "userId"
> & {
  basis: DecisionBasis[];
  dangerSignals: DangerSignal[];
};

export async function updateDecision(
  id: string,
  userId: string,
  patch: {
    actualPrice?: number | null;
    priceAfter7Days?: number | null;
    priceAfter30Days?: number | null;
    return30Days?: number | null;
    postReflection?: string | null;
  }
): Promise<Decision> {
  const set: Record<string, unknown> = {};
  if ("actualPrice" in patch) set.actualPrice = patch.actualPrice;
  if ("priceAfter7Days" in patch) set.priceAfter7Days = patch.priceAfter7Days;
  if ("priceAfter30Days" in patch) set.priceAfter30Days = patch.priceAfter30Days;
  if ("return30Days" in patch) set.return30Days = patch.return30Days;
  if ("postReflection" in patch) set.postReflection = patch.postReflection;

  await db.update(decisions).set(set).where(and(eq(decisions.id, id), eq(decisions.userId, userId)));
  const updated = await getDecisionById(id, userId);
  if (!updated) throw new Error("Decision not found");
  return updated;
}

/** 补全由批量导入创建的 incomplete 决策卡（仅允许在 incomplete=1 时调用）。 */
export async function completeDecision(
  id: string,
  userId: string,
  patch: {
    reason: string;
    basis: DecisionBasis[];
    systemAlignment: "ALIGN" | "PARTIAL" | "NOT_ALIGN";
    calmScore: number;
    confidenceScore: number;
    fomoScore: number;
    stopLossPrice: number;
    maxAcceptableLoss: number;
    dangerSignals: DangerSignal[];
  }
): Promise<Decision> {
  const set: Record<string, unknown> = {
    reason: patch.reason,
    basis: JSON.stringify(patch.basis),
    systemAlignment: patch.systemAlignment,
    calmScore: patch.calmScore,
    confidenceScore: patch.confidenceScore,
    fomoScore: patch.fomoScore,
    stopLossPrice: patch.stopLossPrice,
    maxAcceptableLoss: patch.maxAcceptableLoss,
    dangerSignals: JSON.stringify(patch.dangerSignals),
    incomplete: 0,
  };
  await db.update(decisions).set(set).where(
    and(eq(decisions.id, id), eq(decisions.userId, userId))
  );
  const updated = await getDecisionById(id, userId);
  if (!updated) throw new Error("Decision not found");
  return updated;
}

export async function createDecision(input: InsertDecision, userId: string): Promise<Decision> {
  const row = {
    ...input,
    userId,
    basis: JSON.stringify(input.basis),
    dangerSignals: JSON.stringify(input.dangerSignals),
  };
  await db.insert(decisions).values(row);
  const created = await getDecisionById(input.id, userId);
  if (!created) throw new Error("Failed to create decision");
  return created;
}

export type BatchInsertDecision = {
  id: string;
  stockCode: string;
  stockName: string;
  stockMarket: "SH" | "SZ" | "BJ";
  action: "BUY" | "ADD" | "SELL" | "REDUCE" | "CLEAR";
  price: number;
  quantity: number;
  tradedAt?: number;
};

export async function batchCreateDecisions(
  items: BatchInsertDecision[],
  userId: string
): Promise<{ created: Decision[]; failed: { index: number; reason: string }[] }> {
  const created: Decision[] = [];
  const failed: { index: number; reason: string }[] = [];
  const now = Date.now();

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    try {
      const stopLossPrice = parseFloat((item.price * 0.92).toFixed(2));
      const amount = parseFloat((item.price * item.quantity).toFixed(2));
      const row = {
        id: item.id,
        stockCode: item.stockCode,
        stockName: item.stockName,
        stockMarket: item.stockMarket,
        action: item.action,
        price: item.price,
        quantity: item.quantity,
        amount,
        reason: "批量导入，待补全",
        basis: "[]",
        systemAlignment: "ALIGN" as const,
        calmScore: 5,
        confidenceScore: 5,
        fomoScore: 3,
        stopLossPrice,
        maxAcceptableLoss: parseFloat((Math.abs(item.price - stopLossPrice) * item.quantity).toFixed(2)),
        dangerSignals: "[]",
        status: "ACTIVE" as const,
        incomplete: 1,
        // Always use current time so batch imports surface at the top of the list,
        // regardless of the historical trade date in the screenshot.
        createdAt: now,
        userId,
      };
      await db.insert(decisions).values(row);
      const decision = await getDecisionById(item.id, userId);
      if (!decision) throw new Error("Insert succeeded but row not found");
      created.push(decision);
    } catch (err) {
      failed.push({ index: i, reason: err instanceof Error ? err.message : "未知错误" });
    }
  }

  return { created, failed };
}

export async function voidDecision(
  id: string,
  userId: string,
  reason: VoidedReason,
  now: number = Date.now()
): Promise<Decision> {
  await db
    .update(decisions)
    .set({ status: "VOIDED", voidedReason: reason, voidedAt: now })
    .where(
      and(
        eq(decisions.id, id),
        eq(decisions.userId, userId),
        eq(decisions.status, "ACTIVE")
      )
    );
  const updated = await getDecisionById(id, userId);
  if (!updated) throw new Error("Decision not found after void");
  return updated;
}

export async function archiveDecision(id: string, userId: string): Promise<Decision> {
  await db
    .update(decisions)
    .set({ status: "ARCHIVED" })
    .where(
      and(
        eq(decisions.id, id),
        eq(decisions.userId, userId),
        eq(decisions.status, "ACTIVE")
      )
    );
  const updated = await getDecisionById(id, userId);
  if (!updated) throw new Error("Decision not found after archive");
  return updated;
}
