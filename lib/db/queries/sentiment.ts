import { desc, eq, lt } from "drizzle-orm";
import { db } from "../index";
import { marketSentimentDaily, dailyMarketState } from "../schema";
import {
  computeStage,
  type SentimentMetrics,
  type StageDecision,
  type StageCaps,
  type StageThresholds,
} from "@/lib/sentiment/stage";

export type DailyMetricsInput = {
  tradeDate: string; // YYYY-MM-DD
  limitUpCount: number | null;
  limitDownCount: number | null;
  sealRate: number | null;
  maxConsecBoards: number | null;
  turnoverYi: number | null;
  prevLimitPremium: number | null;
  rawPayload?: string | null;
};

export type DailyState = {
  tradeDate: string;
  stage: StageDecision["stage"];
  positionCap: number;
  triggerSnapshot: { triggers: string[]; metrics: SentimentMetrics };
  prevMetrics: SentimentMetrics | null;
};

export type SentimentTrendRow = {
  tradeDate: string;
  limitUpCount: number | null;
  sealRate: number | null;
  maxConsecBoards: number | null;
  limitDownCount: number | null;
  turnoverYi: number | null;
};

function metricsOf(row: typeof marketSentimentDaily.$inferSelect): SentimentMetrics {
  return {
    limitUpCount: row.limitUpCount,
    limitDownCount: row.limitDownCount,
    sealRate: row.sealRate,
    maxConsecBoards: row.maxConsecBoards,
    turnoverYi: row.turnoverYi,
    prevLimitPremium: row.prevLimitPremium,
  };
}

export async function upsertDailyMetrics(input: DailyMetricsInput): Promise<void> {
  const now = Date.now();
  await db
    .insert(marketSentimentDaily)
    .values({
      tradeDate: input.tradeDate,
      limitUpCount: input.limitUpCount,
      limitDownCount: input.limitDownCount,
      sealRate: input.sealRate,
      maxConsecBoards: input.maxConsecBoards,
      turnoverYi: input.turnoverYi,
      prevLimitPremium: input.prevLimitPremium,
      rawPayload: input.rawPayload ?? null,
      createdAt: now,
    })
    .onConflictDoUpdate({
      target: marketSentimentDaily.tradeDate,
      set: {
        limitUpCount: input.limitUpCount,
        limitDownCount: input.limitDownCount,
        sealRate: input.sealRate,
        maxConsecBoards: input.maxConsecBoards,
        turnoverYi: input.turnoverYi,
        prevLimitPremium: input.prevLimitPremium,
        rawPayload: input.rawPayload ?? null,
      },
    });

  // 拿前一交易日（最近的一条早于 tradeDate 的记录）
  const prevRow = await db
    .select()
    .from(marketSentimentDaily)
    .where(lt(marketSentimentDaily.tradeDate, input.tradeDate))
    .orderBy(desc(marketSentimentDaily.tradeDate))
    .limit(1);

  const today: SentimentMetrics = {
    limitUpCount: input.limitUpCount,
    limitDownCount: input.limitDownCount,
    sealRate: input.sealRate,
    maxConsecBoards: input.maxConsecBoards,
    turnoverYi: input.turnoverYi,
    prevLimitPremium: input.prevLimitPremium,
  };
  const yesterday = prevRow[0] ? metricsOf(prevRow[0]) : undefined;
  const decision = computeStage(today, yesterday);

  const snapshot = JSON.stringify({ triggers: decision.triggers, metrics: today });

  await db
    .insert(dailyMarketState)
    .values({
      tradeDate: input.tradeDate,
      stage: decision.stage,
      positionCap: decision.positionCap,
      triggerSnapshot: snapshot,
      createdAt: now,
    })
    .onConflictDoUpdate({
      target: dailyMarketState.tradeDate,
      set: {
        stage: decision.stage,
        positionCap: decision.positionCap,
        triggerSnapshot: snapshot,
      },
    });
}

export async function getLatestState(
  caps?: StageCaps,
  thresholds?: StageThresholds
): Promise<DailyState | null> {
  const rows = await db
    .select()
    .from(dailyMarketState)
    .orderBy(desc(dailyMarketState.tradeDate))
    .limit(1);
  const row = rows[0];
  if (!row) return null;

  const todayMetricsRow = await db
    .select()
    .from(marketSentimentDaily)
    .where(eq(marketSentimentDaily.tradeDate, row.tradeDate))
    .limit(1);

  const prevRow = await db
    .select()
    .from(marketSentimentDaily)
    .where(lt(marketSentimentDaily.tradeDate, row.tradeDate))
    .orderBy(desc(marketSentimentDaily.tradeDate))
    .limit(1);
  const prevMetrics = prevRow[0] ? metricsOf(prevRow[0]) : null;

  // 当用户提供自定义阈值时，按用户阈值重新计算阶段；否则沿用持久化的阶段
  let stage = row.stage as StageDecision["stage"];
  let triggers: string[] = [];
  if (thresholds && todayMetricsRow[0]) {
    const today = metricsOf(todayMetricsRow[0]);
    const decision = computeStage(today, prevMetrics ?? undefined, caps ?? undefined, thresholds);
    stage = decision.stage;
    triggers = decision.triggers;
  }

  const persistedSnapshot = JSON.parse(row.triggerSnapshot) as DailyState["triggerSnapshot"];
  const triggerSnapshot = thresholds && triggers.length > 0
    ? { triggers, metrics: persistedSnapshot.metrics }
    : persistedSnapshot;

  return {
    tradeDate: row.tradeDate,
    stage,
    positionCap: caps ? caps[stage] : row.positionCap,
    triggerSnapshot,
    prevMetrics,
  };
}

export async function getSentimentTrend(days = 14): Promise<SentimentTrendRow[]> {
  const rows = await db
    .select({
      tradeDate: marketSentimentDaily.tradeDate,
      limitUpCount: marketSentimentDaily.limitUpCount,
      sealRate: marketSentimentDaily.sealRate,
      maxConsecBoards: marketSentimentDaily.maxConsecBoards,
      limitDownCount: marketSentimentDaily.limitDownCount,
      turnoverYi: marketSentimentDaily.turnoverYi,
    })
    .from(marketSentimentDaily)
    .orderBy(desc(marketSentimentDaily.tradeDate))
    .limit(days);
  return rows.reverse(); // 旧 → 新便于画图
}

export async function hasMetricsForDate(tradeDate: string): Promise<boolean> {
  const rows = await db
    .select({ tradeDate: marketSentimentDaily.tradeDate })
    .from(marketSentimentDaily)
    .where(eq(marketSentimentDaily.tradeDate, tradeDate))
    .limit(1);
  return rows.length > 0;
}

export type StageHistoryRow = {
  tradeDate: string;
  stage: StageDecision["stage"];
  positionCap: number;
};

export async function getStageHistory(days = 30, caps?: StageCaps): Promise<StageHistoryRow[]> {
  const rows = await db
    .select({
      tradeDate: dailyMarketState.tradeDate,
      stage: dailyMarketState.stage,
      positionCap: dailyMarketState.positionCap,
    })
    .from(dailyMarketState)
    .orderBy(desc(dailyMarketState.tradeDate))
    .limit(days);
  return rows.reverse().map((r) => {
    const stage = r.stage as StageDecision["stage"];
    return {
      tradeDate: r.tradeDate,
      stage,
      positionCap: caps ? caps[stage] : r.positionCap,
    };
  });
}
