import { desc, eq } from "drizzle-orm";
import { db } from "../index";
import { decisions } from "../schema";
import type { Decision, DangerSignal, DecisionBasis } from "@/types/decision";

function rowToDecision(row: typeof decisions.$inferSelect): Decision {
  return {
    ...row,
    basis: JSON.parse(row.basis) as DecisionBasis[],
    dangerSignals: JSON.parse(row.dangerSignals) as DangerSignal[],
    isArchived: Boolean(row.isArchived),
  };
}

export async function getDecisions(limit = 50): Promise<Decision[]> {
  const rows = await db
    .select()
    .from(decisions)
    .where(eq(decisions.isArchived, false))
    .orderBy(desc(decisions.createdAt))
    .limit(limit);
  return rows.map(rowToDecision);
}

export async function getDecisionById(id: string): Promise<Decision | null> {
  const rows = await db
    .select()
    .from(decisions)
    .where(eq(decisions.id, id))
    .limit(1);
  return rows[0] ? rowToDecision(rows[0]) : null;
}

export type InsertDecision = Omit<
  typeof decisions.$inferInsert,
  "basis" | "dangerSignals"
> & {
  basis: DecisionBasis[];
  dangerSignals: DangerSignal[];
};

export async function updateDecision(
  id: string,
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

  await db.update(decisions).set(set).where(eq(decisions.id, id));
  const updated = await getDecisionById(id);
  if (!updated) throw new Error("Decision not found");
  return updated;
}

export async function createDecision(input: InsertDecision): Promise<Decision> {
  const row = {
    ...input,
    basis: JSON.stringify(input.basis),
    dangerSignals: JSON.stringify(input.dangerSignals),
  };
  await db.insert(decisions).values(row);
  const created = await getDecisionById(input.id);
  if (!created) throw new Error("Failed to create decision");
  return created;
}
