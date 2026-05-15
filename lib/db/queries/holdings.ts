import { and, eq, desc } from "drizzle-orm";
import { db } from "../index";
import { holdings } from "../schema";
import type {
  Holding,
  HoldingLogic,
  Prerequisite,
  ExitCondition,
} from "@/types/holding";
import { calcHealthScore } from "@/lib/health-score";

function rowToHolding(row: typeof holdings.$inferSelect): Holding {
  const logic = JSON.parse(row.logic) as HoldingLogic;
  const prerequisites = JSON.parse(row.prerequisites) as Prerequisite[];
  const exitConditions = JSON.parse(row.exitConditions) as ExitCondition[];
  const h: Holding = {
    ...row,
    logic,
    prerequisites,
    exitConditions,
    healthScore: 0,
  };
  h.healthScore = calcHealthScore(h);
  return h;
}

export async function getHoldings(userId: string): Promise<Holding[]> {
  const rows = await db
    .select()
    .from(holdings)
    .where(eq(holdings.userId, userId))
    .orderBy(desc(holdings.updatedAt));
  return rows.map(rowToHolding);
}

export async function getHoldingById(id: string, userId: string): Promise<Holding | null> {
  const rows = await db
    .select()
    .from(holdings)
    .where(and(eq(holdings.id, id), eq(holdings.userId, userId)))
    .limit(1);
  return rows[0] ? rowToHolding(rows[0]) : null;
}

export type InsertHolding = Omit<
  typeof holdings.$inferInsert,
  "logic" | "prerequisites" | "exitConditions" | "userId"
> & {
  logic: HoldingLogic;
  prerequisites: Prerequisite[];
  exitConditions: ExitCondition[];
};

export async function createHolding(input: InsertHolding, userId: string): Promise<Holding> {
  const row = {
    ...input,
    userId,
    logic: JSON.stringify(input.logic),
    prerequisites: JSON.stringify(input.prerequisites),
    exitConditions: JSON.stringify(input.exitConditions),
  };
  await db.insert(holdings).values(row);
  const created = await getHoldingById(input.id, userId);
  if (!created) throw new Error("Failed to create holding");
  return created;
}

export async function updateHolding(
  id: string,
  userId: string,
  patch: Partial<InsertHolding>
): Promise<Holding> {
  const now = Date.now();
  const row: Record<string, unknown> = { updatedAt: now };

  if (patch.logic !== undefined) row.logic = JSON.stringify(patch.logic);
  if (patch.prerequisites !== undefined)
    row.prerequisites = JSON.stringify(patch.prerequisites);
  if (patch.exitConditions !== undefined)
    row.exitConditions = JSON.stringify(patch.exitConditions);

  const scalar = [
    "status",
    "costPrice",
    "currentPrice",
    "shares",
    "sector",
  ] as const;
  for (const key of scalar) {
    if (patch[key] !== undefined) row[key] = patch[key];
  }

  await db.update(holdings).set(row).where(and(eq(holdings.id, id), eq(holdings.userId, userId)));
  const updated = await getHoldingById(id, userId);
  if (!updated) throw new Error("Holding not found");
  return updated;
}
