import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { fetchSinaHq } from "@/lib/quotes/sina";
import { getCached, setCached } from "@/lib/quotes/cache";

const CACHE_TTL_MS = 30_000;
const INDEX_CODES = ["s_sh000001", "s_sz399001", "s_sz399006"] as const;

export type MarketIndexQuote = {
  code: string;
  name: string;
  last: number;
  prevClose: number;
  pctChg: number;
  ts: number;
};

export type MarketIndexResponse = {
  sh: MarketIndexQuote | null;
  sz: MarketIndexQuote | null;
  cy: MarketIndexQuote | null;
};

const KEY_BY_CODE: Record<string, keyof MarketIndexResponse> = {
  s_sh000001: "sh",
  s_sz399001: "sz",
  s_sz399006: "cy",
};

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cacheKey = `index:${INDEX_CODES.join(",")}`;
  const cached = getCached<MarketIndexResponse>(cacheKey);
  if (cached) return NextResponse.json(cached);

  const result: MarketIndexResponse = { sh: null, sz: null, cy: null };

  try {
    const quotes = await fetchSinaHq([...INDEX_CODES]);
    for (const code of INDEX_CODES) {
      const q = quotes.get(code);
      if (!q) continue;
      const pctChg = q.prevClose > 0 ? ((q.price - q.prevClose) / q.prevClose) * 100 : 0;
      result[KEY_BY_CODE[code]] = {
        code,
        name: q.name,
        last: q.price,
        prevClose: q.prevClose,
        pctChg: Math.round(pctChg * 100) / 100,
        ts: q.ts,
      };
    }
    setCached(cacheKey, result, CACHE_TTL_MS);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(result);
  }
}
