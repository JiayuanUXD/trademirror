import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { decisions } from "@/lib/db/schema";
import { eq, desc, sql } from "drizzle-orm";

export type RecentStock = {
  stockCode: string;
  stockName: string;
  stockMarket: "SH" | "SZ" | "BJ";
};

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    // Group by stockCode to deduplicate, ordered by most recent activity
    const rows = await db
      .select({
        stockCode: decisions.stockCode,
        stockName: decisions.stockName,
        stockMarket: decisions.stockMarket,
        lastAt: sql<number>`MAX(COALESCE(${decisions.tradedAt}, ${decisions.createdAt}))`,
      })
      .from(decisions)
      .where(eq(decisions.userId, userId))
      .groupBy(decisions.stockCode, decisions.stockName, decisions.stockMarket)
      .orderBy(desc(sql`MAX(COALESCE(${decisions.tradedAt}, ${decisions.createdAt}))`))
      .limit(8);

    const result: RecentStock[] = rows.map((r) => ({
      stockCode: r.stockCode,
      stockName: r.stockName,
      stockMarket: r.stockMarket as "SH" | "SZ" | "BJ",
    }));

    return NextResponse.json(result);
  } catch (err) {
    console.error("[GET /api/decisions/recent-stocks]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
