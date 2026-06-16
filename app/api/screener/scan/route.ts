import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { fetchEastmoneyClist } from "@/lib/screener/eastmoney-clist";
import { runFunnel } from "@/lib/screener/funnel";
import { getLatestState } from "@/lib/db/queries/sentiment";
import { getSettings } from "@/lib/db/queries/settings";
import { createSnapshot } from "@/lib/db/queries/screener";
import { capsFromSettings, thresholdsFromSettings } from "@/lib/sentiment/stage";
import { shanghaiTradingContext } from "@/lib/sentiment/trading-day";
import { runBackfill } from "@/lib/screener/backfill";

function isCronRequest(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function resolveUserId(req: NextRequest, fromCron: boolean): Promise<string | null> {
  if (fromCron) return process.env.CRON_USER_ID ?? "jiayuan";
  const session = await auth();
  return session?.user?.id ?? null;
}

export async function POST(req: NextRequest) {
  const fromCron = isCronRequest(req);
  const userId = await resolveUserId(req, fromCron);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ctx = shanghaiTradingContext();
  const force = req.nextUrl.searchParams.get("force") === "1";

  if (!ctx.isTrading && !force) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: "non_trading_day",
      tradeDate: ctx.dateDash,
    });
  }

  try {
    const userSettings = await getSettings(userId);
    const caps = capsFromSettings(userSettings);
    const thresholds = thresholdsFromSettings(userSettings);
    const sentimentState = await getLatestState(caps, thresholds);
    const stage = sentimentState?.stage ?? "REPAIR";

    const marketRows = await fetchEastmoneyClist();
    const result = await runFunnel({
      stage,
      settings: {
        minTurnoverYi: userSettings.minTurnoverYi,
        minTurnoverRatePct: userSettings.minTurnoverRatePct,
        maxTurnoverRatePct: userSettings.maxTurnoverRatePct,
        minPrice: userSettings.minPrice,
        maxPrice: userSettings.maxPrice,
        excludeSt: userSettings.excludeSt,
        excludeNew: userSettings.excludeNew,
        maxPoolSize: userSettings.maxPoolSize,
      },
      marketRows,
    });

    const snap = await createSnapshot({
      userId,
      tradeDate: ctx.dateDash,
      result,
    });

    // 回填历史候选的 T+N 收益（non-blocking：不阻塞响应）
    const backfillPromise = runBackfill(ctx.dateDash).catch((e) =>
      console.error("[backfill]", e)
    );

    // Cron 等回填完再返回（避免 function 提前退出），手动扫描直接返回
    let backfillResult: { attempted: number; filled: number } | null = null;
    if (fromCron) {
      backfillResult = (await backfillPromise) as { attempted: number; filled: number } | null;
    }

    return NextResponse.json({
      ok: true,
      tradeDate: ctx.dateDash,
      snapshot: snap.snapshot,
      candidates: snap.candidates,
      backfill: backfillResult ?? undefined,
    });
  } catch (err) {
    console.error("[POST /api/screener/scan]", err);
    const msg = err instanceof Error ? err.message : "扫描失败";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  if (!isCronRequest(req)) {
    return NextResponse.json({ error: "GET only for cron. Use POST." }, { status: 405 });
  }
  return POST(req);
}
