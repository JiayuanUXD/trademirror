import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { fetchSinaHq } from "@/lib/quotes/sina";
import { getCached, setCached } from "@/lib/quotes/cache";

const CACHE_TTL_MS = 30_000;

/**
 * Batch fetch current prices for multiple stocks.
 * Response shape: Record<code6, number> — stable contract for /holdings list.
 *
 * GET /api/stocks/batch-price?stocks=sh600176,sz000001,sh515880
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const stocks = req.nextUrl.searchParams.get("stocks")?.trim();
  if (!stocks) {
    return NextResponse.json({ error: "Missing stocks param" }, { status: 400 });
  }

  const codes = stocks.split(",").filter(Boolean);
  if (codes.length === 0 || codes.length > 50) {
    return NextResponse.json({ error: "1-50 stock codes allowed" }, { status: 400 });
  }

  const validPattern = /^(sh|sz|bj)\d{6}$/;
  if (!codes.every((c) => validPattern.test(c))) {
    return NextResponse.json({ error: "Invalid stock code format" }, { status: 400 });
  }

  const cacheKey = `batch:${[...codes].sort().join(",")}`;
  const cached = getCached<Record<string, number>>(cacheKey);
  if (cached) return NextResponse.json(cached);

  try {
    const quotes = await fetchSinaHq(codes);
    const prices: Record<string, number> = {};
    for (const [fullCode, q] of quotes) {
      const code6 = fullCode.replace(/^(sh|sz|bj)/, "");
      prices[code6] = q.price;
    }
    setCached(cacheKey, prices, CACHE_TTL_MS);
    return NextResponse.json(prices);
  } catch {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }
}
