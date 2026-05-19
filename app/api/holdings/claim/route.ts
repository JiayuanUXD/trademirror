/**
 * POST /api/holdings/claim
 *
 * Promotes an "inferred" holding (decisions exist, no profile) into a real
 * holdings record. Returns the newly created Holding.
 *
 * Body: { stockCode: string }
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { z } from "zod";
import { db } from "@/lib/db";
import { decisions, holdings } from "@/lib/db/schema";
import { and, eq, ne } from "drizzle-orm";
import { createHolding, getHoldings } from "@/lib/db/queries/holdings";

const bodySchema = z.object({
  stockCode: z.string().min(1).max(6),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body: unknown = await req.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const { stockCode } = parsed.data;

  // Check not already in holdings
  const existing = await db
    .select({ id: holdings.id })
    .from(holdings)
    .where(and(eq(holdings.stockCode, stockCode), eq(holdings.userId, userId)))
    .limit(1);
  if (existing.length > 0) {
    return NextResponse.json({ error: "Already has a profile" }, { status: 409 });
  }

  // Fetch stock metadata from decisions
  const decisionRow = await db
    .select({
      stockName: decisions.stockName,
      stockMarket: decisions.stockMarket,
      createdAt: decisions.createdAt,
    })
    .from(decisions)
    .where(
      and(
        eq(decisions.stockCode, stockCode),
        eq(decisions.userId, userId),
        ne(decisions.status, "VOIDED")
      )
    )
    .limit(1);

  if (decisionRow.length === 0) {
    return NextResponse.json({ error: "No decisions found for this stock" }, { status: 404 });
  }

  const ref = decisionRow[0];
  const now = Date.now();

  const holding = await createHolding(
    {
      id: crypto.randomUUID(),
      stockCode,
      stockName: ref.stockName,
      stockMarket: ref.stockMarket,
      status: "WATCHING", // will be overridden by computed position at read time
      costPrice: 0,
      currentPrice: null,
      shares: 0,
      sector: "",
      logic: { reasons: [], moat: "", keyFinancials: "", logicScore: 0 },
      prerequisites: [],
      exitConditions: [],
      createdAt: ref.createdAt,
      updatedAt: now,
    },
    userId
  );

  return NextResponse.json(holding, { status: 201 });
}
