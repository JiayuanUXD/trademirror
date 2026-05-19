import { and, eq, desc } from "drizzle-orm";
import { db } from "../index";
import { holdings, decisions } from "../schema";
import type {
  Holding,
  HoldingStatus,
  HoldingLogic,
  Prerequisite,
  ExitCondition,
} from "@/types/holding";
import { calcHealthScore } from "@/lib/health-score";

// ─── Position computation ────────────────────────────────────────────────────

type DecisionRow = {
  stockCode: string;
  stockName: string;
  stockMarket: "SH" | "SZ" | "BJ";
  action: "BUY" | "ADD" | "SELL" | "REDUCE" | "CLEAR";
  price: number;
  quantity: number;
  status: string;
  createdAt: number;
};

/**
 * Compute shares and average cost price from decision history.
 * VOIDED decisions are excluded (they never happened).
 * Processes in chronological order.
 */
function computePosition(rows: DecisionRow[]): { shares: number; costPrice: number } {
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
      if (shares > 0) {
        totalInvested -= (totalInvested / shares) * sold;
      }
      shares = Math.max(0, shares - sold);
    } else if (d.action === "CLEAR") {
      shares = 0;
      totalInvested = 0;
    }
  }

  const costPrice =
    shares > 0 ? Math.round((totalInvested / shares) * 1000) / 1000 : 0;
  return { shares, costPrice };
}

/**
 * Derive holding status from computed position.
 * - Has non-voided decisions → HOLDING (shares > 0) or CLOSED (shares = 0)
 * - No decisions at all     → use the manually stored status (e.g. WATCHING)
 */
function deriveStatus(
  shares: number,
  hasDecisions: boolean,
  storedStatus: string
): HoldingStatus {
  if (hasDecisions) return shares > 0 ? "HOLDING" : "CLOSED";
  return storedStatus as HoldingStatus;
}

// ─── Row mapping ─────────────────────────────────────────────────────────────

function rowToHolding(
  row: typeof holdings.$inferSelect,
  computed: { shares: number; costPrice: number; status: HoldingStatus }
): Holding {
  const logic = JSON.parse(row.logic) as HoldingLogic;
  const prerequisites = JSON.parse(row.prerequisites) as Prerequisite[];
  const exitConditions = JSON.parse(row.exitConditions) as ExitCondition[];
  const h: Holding = {
    ...row,
    logic,
    prerequisites,
    exitConditions,
    // Overwrite stored quantitative fields with computed values
    shares: computed.shares,
    costPrice: computed.costPrice,
    status: computed.status,
    healthScore: 0,
  };
  h.healthScore = calcHealthScore(h);
  return h;
}

// ─── Queries ─────────────────────────────────────────────────────────────────

export async function getHoldings(userId: string): Promise<Holding[]> {
  const [holdingRows, decisionRows] = await Promise.all([
    db
      .select()
      .from(holdings)
      .where(eq(holdings.userId, userId))
      .orderBy(desc(holdings.updatedAt)),
    db
      .select({
        stockCode: decisions.stockCode,
        stockName: decisions.stockName,
        stockMarket: decisions.stockMarket,
        action: decisions.action,
        price: decisions.price,
        quantity: decisions.quantity,
        status: decisions.status,
        createdAt: decisions.createdAt,
      })
      .from(decisions)
      .where(eq(decisions.userId, userId)),
  ]);

  // Group decisions by stockCode
  const decisionsByStock = new Map<string, DecisionRow[]>();
  for (const d of decisionRows) {
    if (!decisionsByStock.has(d.stockCode)) decisionsByStock.set(d.stockCode, []);
    decisionsByStock.get(d.stockCode)!.push(d);
  }

  // ── Real holdings (have a profile record) ──────────────────────────────
  const existingCodes = new Set(holdingRows.map((r) => r.stockCode));
  const result: Holding[] = holdingRows.map((row) => {
    const stockDecisions = decisionsByStock.get(row.stockCode) ?? [];
    const { shares, costPrice } = computePosition(stockDecisions);
    const hasDecisions = stockDecisions.some((d) => d.status !== "VOIDED");
    const status = deriveStatus(shares, hasDecisions, row.status);
    return rowToHolding(row, { shares, costPrice, status });
  });

  // ── Inferred holdings (decisions exist but no profile) ─────────────────
  const emptyLogic: import("@/types/holding").HoldingLogic = {
    reasons: [],
    moat: "",
    keyFinancials: "",
    logicScore: 0,
  };

  for (const [code, stockDecisions] of decisionsByStock) {
    if (existingCodes.has(code)) continue;
    const validDecisions = stockDecisions.filter((d) => d.status !== "VOIDED");
    if (validDecisions.length === 0) continue;

    const { shares, costPrice } = computePosition(stockDecisions);
    const status: HoldingStatus = shares > 0 ? "HOLDING" : "CLOSED";

    // Use the most recent non-voided decision for stock metadata
    const ref = [...validDecisions].sort((a, b) => b.createdAt - a.createdAt)[0];

    result.push({
      id: `inferred:${code}`,
      stockCode: code,
      stockName: ref.stockName,
      stockMarket: ref.stockMarket,
      status,
      costPrice,
      currentPrice: null,
      shares,
      sector: "",
      logic: emptyLogic,
      prerequisites: [],
      exitConditions: [],
      healthScore: 0,
      createdAt: ref.createdAt,
      updatedAt: ref.createdAt,
      inferred: true,
    });
  }

  // Sort: real holdings first (by updatedAt desc), then inferred (by createdAt desc)
  result.sort((a, b) => {
    if (!!a.inferred !== !!b.inferred) return a.inferred ? 1 : -1;
    return b.updatedAt - a.updatedAt;
  });

  return result;
}

export async function getHoldingById(id: string, userId: string): Promise<Holding | null> {
  // Inferred holdings don't exist in the DB
  if (id.startsWith("inferred:")) return null;

  const rows = await db
    .select()
    .from(holdings)
    .where(and(eq(holdings.id, id), eq(holdings.userId, userId)))
    .limit(1);
  const row = rows[0];
  if (!row) return null;

  const decisionRows = await db
    .select({
      stockCode: decisions.stockCode,
      stockName: decisions.stockName,
      stockMarket: decisions.stockMarket,
      action: decisions.action,
      price: decisions.price,
      quantity: decisions.quantity,
      status: decisions.status,
      createdAt: decisions.createdAt,
    })
    .from(decisions)
    .where(and(eq(decisions.stockCode, row.stockCode), eq(decisions.userId, userId)));

  const { shares, costPrice } = computePosition(decisionRows);
  const hasDecisions = decisionRows.some((d) => d.status !== "VOIDED");
  const status = deriveStatus(shares, hasDecisions, row.status);
  return rowToHolding(row, { shares, costPrice, status });
}

// ─── Mutations ───────────────────────────────────────────────────────────────

export type InsertHolding = Omit<
  typeof holdings.$inferInsert,
  "logic" | "prerequisites" | "exitConditions" | "userId"
> & {
  logic: HoldingLogic;
  prerequisites: Prerequisite[];
  exitConditions: ExitCondition[];
};

export async function createHolding(
  input: InsertHolding,
  userId: string
): Promise<Holding> {
  const row = {
    ...input,
    // These are computed at read time; store neutral defaults
    shares: 0,
    costPrice: 0,
    status: input.status ?? "WATCHING",
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
  patch: Partial<
    Pick<InsertHolding, "logic" | "prerequisites" | "exitConditions" | "sector"> & {
      /** Only WATCHING can be set manually; HOLDING/CLOSED are derived from decisions */
      status: HoldingStatus;
      currentPrice: number | null;
    }
  >
): Promise<Holding> {
  const now = Date.now();
  const row: Record<string, unknown> = { updatedAt: now };

  if (patch.logic !== undefined) row.logic = JSON.stringify(patch.logic);
  if (patch.prerequisites !== undefined) row.prerequisites = JSON.stringify(patch.prerequisites);
  if (patch.exitConditions !== undefined) row.exitConditions = JSON.stringify(patch.exitConditions);
  if (patch.status !== undefined) row.status = patch.status;
  if (patch.currentPrice !== undefined) row.currentPrice = patch.currentPrice;
  if (patch.sector !== undefined) row.sector = patch.sector;

  await db
    .update(holdings)
    .set(row)
    .where(and(eq(holdings.id, id), eq(holdings.userId, userId)));

  const updated = await getHoldingById(id, userId);
  if (!updated) throw new Error("Holding not found");
  return updated;
}
