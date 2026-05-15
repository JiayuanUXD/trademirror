import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { decisions, holdings } from "@/lib/db/schema";
import { eq, or, like } from "drizzle-orm";

export type StockResult = {
  code: string;
  name: string;
  market: "SH" | "SZ" | "BJ";
};

function codeToMarket(code: string): "SH" | "SZ" | "BJ" {
  if (code.startsWith("6")) return "SH";
  if (code.startsWith("4") || code.startsWith("8")) return "BJ";
  return "SZ";
}

async function searchHistorical(q: string, userId: string): Promise<StockResult[]> {
  const rows = await db
    .select({ code: decisions.stockCode, name: decisions.stockName, market: decisions.stockMarket })
    .from(decisions)
    .where(eq(decisions.userId, userId))
    .limit(200);

  const holdingRows = await db
    .select({ code: holdings.stockCode, name: holdings.stockName, market: holdings.stockMarket })
    .from(holdings)
    .where(eq(holdings.userId, userId))
    .limit(200);

  const all = [...rows, ...holdingRows];
  const seen = new Set<string>();
  const results: StockResult[] = [];

  for (const r of all) {
    if (seen.has(r.code)) continue;
    if (r.code.includes(q) || r.name.includes(q)) {
      seen.add(r.code);
      results.push({ code: r.code, name: r.name, market: r.market as "SH" | "SZ" | "BJ" });
    }
  }
  return results.slice(0, 10);
}

async function searchExternal(q: string): Promise<StockResult[]> {
  try {
    const url = `https://searchapi.eastmoney.com/api/suggest/get?input=${encodeURIComponent(q)}&type=14&token=D43BF722C8E33BDC906FB84D85E326E8&count=10`;
    const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return [];
    const data = await res.json();

    const items = data?.QuotationCodeTable?.Data;
    if (!Array.isArray(items)) return [];

    return items
      .filter((item: { SecurityTypeName: string }) =>
        item.SecurityTypeName === "沪A" || item.SecurityTypeName === "深A" || item.SecurityTypeName === "京A"
      )
      .map((item: { Code: string; Name: string }) => ({
        code: item.Code,
        name: item.Name,
        market: codeToMarket(item.Code),
      }));
  } catch {
    return [];
  }
}

export async function GET(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 1) {
    return NextResponse.json([]);
  }

  const [historical, external] = await Promise.all([
    searchHistorical(q, userId),
    searchExternal(q),
  ]);

  // Merge: historical first, then external (deduped)
  const seen = new Set(historical.map((r) => r.code));
  const merged: StockResult[] = [...historical];
  for (const r of external) {
    if (!seen.has(r.code)) {
      seen.add(r.code);
      merged.push(r);
    }
  }

  return NextResponse.json(merged.slice(0, 10));
}
