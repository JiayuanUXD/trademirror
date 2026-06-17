import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { holdings } from "@/lib/db/schema";
import { fetchSinaHq } from "@/lib/quotes/sina";
import { clearCache } from "@/lib/quotes/cache";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const CHUNK = 50;

function isCronRequest(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

function isShanghaiWeekday(): boolean {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Shanghai",
    weekday: "short",
  }).formatToParts(new Date());
  const wd = parts.find((p) => p.type === "weekday")?.value ?? "";
  return wd !== "Sat" && wd !== "Sun";
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export async function POST(req: NextRequest) {
  const fromCron = isCronRequest(req);

  let userFilter: string | null = null;
  if (!fromCron) {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    userFilter = session.user.id;
  }

  const force = req.nextUrl.searchParams.get("force") === "1";
  if (fromCron && !force && !isShanghaiWeekday()) {
    return NextResponse.json({ ok: true, skipped: true, reason: "non_trading_day" });
  }

  const rows = userFilter
    ? await db.select().from(holdings).where(and(eq(holdings.status, "HOLDING"), eq(holdings.userId, userFilter)))
    : await db.select().from(holdings).where(eq(holdings.status, "HOLDING"));

  if (rows.length === 0) {
    return NextResponse.json({ ok: true, updated: 0, failed: 0 });
  }

  // Build sina codes once; one quote per (code, market) keyed across all users
  const codeSet = new Set<string>();
  for (const r of rows) {
    codeSet.add(`${r.stockMarket.toLowerCase()}${r.stockCode}`);
  }
  const allCodes = [...codeSet];

  const priceMap = new Map<string, number>();
  let upstreamFailed = 0;
  for (const group of chunk(allCodes, CHUNK)) {
    try {
      const quotes = await fetchSinaHq(group);
      for (const [k, q] of quotes) priceMap.set(k, q.price);
    } catch {
      upstreamFailed += group.length;
    }
  }

  const now = Date.now();
  let updated = 0;
  let failed = 0;
  for (const r of rows) {
    const key = `${r.stockMarket.toLowerCase()}${r.stockCode}`;
    const price = priceMap.get(key);
    if (price === undefined) { failed += 1; continue; }
    try {
      await db
        .update(holdings)
        .set({ currentPrice: price, updatedAt: now })
        .where(and(eq(holdings.id, r.id), eq(holdings.userId, r.userId)));
      updated += 1;
    } catch {
      failed += 1;
    }
  }

  clearCache("batch:");

  return NextResponse.json({
    ok: true,
    updated,
    failed,
    upstreamFailed: upstreamFailed || undefined,
    holdings: rows.length,
  });
}

export async function GET(req: NextRequest) {
  if (!isCronRequest(req)) {
    return NextResponse.json({ error: "GET only for cron. Use POST." }, { status: 405 });
  }
  return POST(req);
}
