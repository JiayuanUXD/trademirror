import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { fetchEastmoneySentiment } from "@/lib/sentiment/fetcher";
import { upsertDailyMetrics, getLatestState, hasMetricsForDate } from "@/lib/db/queries/sentiment";
import { shanghaiTradingContext } from "@/lib/sentiment/trading-day";

// Vercel Cron 通过 Authorization: Bearer ${CRON_SECRET} 调用，跳过 session 校验
function isCronRequest(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const fromCron = isCronRequest(req);
  // 用户调用需登录；Cron 调用需带 secret
  if (!fromCron) {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const ctx = shanghaiTradingContext();

  // 非交易日：Cron 静默跳过，用户手动触发也礼貌返回 skipped（不阻断）
  if (!ctx.isTrading) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: "non_trading_day",
      tradeDate: ctx.dateDash,
    });
  }

  // Cron 去重：同一交易日已抓过则跳过；用户手动可以强制重抓（force=1）
  const force = req.nextUrl.searchParams.get("force") === "1";
  if (fromCron || !force) {
    const exists = await hasMetricsForDate(ctx.dateDash);
    if (exists && fromCron) {
      return NextResponse.json({
        ok: true,
        skipped: true,
        reason: "already_fetched",
        tradeDate: ctx.dateDash,
      });
    }
  }

  try {
    const fetched = await fetchEastmoneySentiment();
    await upsertDailyMetrics(fetched.metrics);
    const latest = await getLatestState();
    return NextResponse.json({
      ok: true,
      source: fetched.source,
      tradeDate: fetched.metrics.tradeDate,
      latest,
    });
  } catch (err) {
    console.error("[POST /api/sentiment/fetch]", err);
    const msg = err instanceof Error ? err.message : "拉取失败";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// GET 支持 Vercel Cron（默认走 GET）
export async function GET(req: NextRequest) {
  return POST(req);
}
