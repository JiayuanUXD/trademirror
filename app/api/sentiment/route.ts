import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { z } from "zod";
import {
  getLatestState,
  getSentimentTrend,
  getStageHistory,
  upsertDailyMetrics,
} from "@/lib/db/queries/sentiment";
import { getSettings } from "@/lib/db/queries/settings";
import { capsFromSettings, thresholdsFromSettings } from "@/lib/sentiment/stage";

const upsertSchema = z.object({
  tradeDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "tradeDate 必须为 YYYY-MM-DD"),
  limitUpCount: z.number().int().nonnegative().nullable(),
  limitDownCount: z.number().int().nonnegative().nullable(),
  sealRate: z.number().min(0).max(1).nullable(),
  maxConsecBoards: z.number().int().nonnegative().nullable(),
  turnoverYi: z.number().nonnegative().nullable(),
  prevLimitPremium: z.number().nullable(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const daysRaw = Number(req.nextUrl.searchParams.get("days") ?? 14);
    const days = [14, 30, 60].includes(daysRaw) ? daysRaw : 14;
    const userSettings = await getSettings(session.user.id);
    const caps = capsFromSettings(userSettings);
    const thresholds = thresholdsFromSettings(userSettings);
    const [latest, trend, stageHistory] = await Promise.all([
      getLatestState(caps, thresholds),
      getSentimentTrend(days),
      getStageHistory(30, caps),
    ]);
    return NextResponse.json({ latest, trend, stageHistory });
  } catch (err) {
    console.error("[GET /api/sentiment]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body: unknown = await req.json();
    const parsed = upsertSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.issues },
        { status: 400 }
      );
    }
    await upsertDailyMetrics(parsed.data);
    const userSettings = await getSettings(session.user.id);
    const caps = capsFromSettings(userSettings);
    const thresholds = thresholdsFromSettings(userSettings);
    const latest = await getLatestState(caps, thresholds);
    return NextResponse.json({ latest }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/sentiment]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
