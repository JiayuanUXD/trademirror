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

export async function getHoldingByStockCode(stockCode: string, userId: string): Promise<Holding | null> {
  const rows = await db
    .select()
    .from(holdings)
    .where(and(eq(holdings.stockCode, stockCode), eq(holdings.userId, userId)))
    .limit(1);
  return rows[0] ? rowToHolding(rows[0]) : null;
}

/**
 * 决策卡提交后同步持仓的 shares 和 costPrice。
 * 仅更新已存在的持仓档案，不自动创建新档案。
 *
 * BUY / ADD  → 加权平均成本 + 增加股数；若持仓已 CLOSED 则重新开启
 * SELL / REDUCE → 减少股数，成本不变
 * CLEAR      → 股数清零，状态改为 CLOSED
 */
export async function syncHoldingFromDecision(
  decision: {
    stockCode: string;
    action: "BUY" | "ADD" | "SELL" | "REDUCE" | "CLEAR";
    price: number;
    quantity: number;
  },
  userId: string
): Promise<void> {
  const holding = await getHoldingByStockCode(decision.stockCode, userId);
  if (!holding) return; // 无对应持仓档案，不处理

  const now = Date.now();
  const patch: Record<string, unknown> = { updatedAt: now };

  if (decision.action === "BUY" || decision.action === "ADD") {
    const newShares = holding.shares + decision.quantity;
    const newCostPrice =
      newShares === 0
        ? decision.price
        : Math.round(
            ((holding.costPrice * holding.shares + decision.price * decision.quantity) / newShares) * 1000
          ) / 1000;
    patch.shares = newShares;
    patch.costPrice = newCostPrice;
    // 若持仓已清仓，重新开启
    if (holding.status === "CLOSED") patch.status = "HOLDING";
  } else if (decision.action === "SELL" || decision.action === "REDUCE") {
    patch.shares = Math.max(0, holding.shares - decision.quantity);
  } else if (decision.action === "CLEAR") {
    patch.shares = 0;
    patch.status = "CLOSED";
  }

  await db.update(holdings).set(patch).where(and(eq(holdings.stockCode, decision.stockCode), eq(holdings.userId, userId)));
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
