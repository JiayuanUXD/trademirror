import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { shanghaiTradingContext } from "@/lib/sentiment/trading-day";
import { backfillSentiment } from "@/lib/sentiment/backfill-sentiment";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const calendarDays = Math.min(Number(body.days) || 21, 90);

  const ctx = shanghaiTradingContext();
  const result = await backfillSentiment(ctx.dateDash, calendarDays);
  return NextResponse.json(result);
}
