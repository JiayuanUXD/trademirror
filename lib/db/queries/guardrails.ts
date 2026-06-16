import { and, eq, gte } from "drizzle-orm";
import dayjs from "dayjs";
import { db } from "../index";
import { guardrailEvents, decisions } from "../schema";

export type GuardrailEventType =
  | "ADD_TO_LOSS"
  | "OVER_SINGLE_POS"
  | "OVER_TOTAL_POS"
  | "OVER_DAILY_COUNT"
  | "MISSING_STOP";

export type GuardrailOutcome = "BLOCKED" | "WARNED" | "OVERRIDDEN";

export type GuardrailStats = {
  totalDays: number;
  totalEvents: number;
  byType: Record<GuardrailEventType, number>;
  byOutcome: Record<GuardrailOutcome, number>;
};

const TYPES: GuardrailEventType[] = [
  "ADD_TO_LOSS",
  "OVER_SINGLE_POS",
  "OVER_TOTAL_POS",
  "OVER_DAILY_COUNT",
  "MISSING_STOP",
];

const OUTCOMES: GuardrailOutcome[] = ["BLOCKED", "WARNED", "OVERRIDDEN"];

export async function getGuardrailStats(
  userId: string,
  days = 30
): Promise<GuardrailStats> {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const rows = await db
    .select({
      eventType: guardrailEvents.eventType,
      outcome: guardrailEvents.outcome,
    })
    .from(guardrailEvents)
    .where(
      and(eq(guardrailEvents.userId, userId), gte(guardrailEvents.createdAt, cutoff))
    );

  const byType = TYPES.reduce<Record<GuardrailEventType, number>>(
    (acc, t) => ((acc[t] = 0), acc),
    {} as Record<GuardrailEventType, number>
  );
  const byOutcome = OUTCOMES.reduce<Record<GuardrailOutcome, number>>(
    (acc, o) => ((acc[o] = 0), acc),
    {} as Record<GuardrailOutcome, number>
  );

  for (const r of rows) {
    byType[r.eventType] += 1;
    byOutcome[r.outcome] += 1;
  }

  return { totalDays: days, totalEvents: rows.length, byType, byOutcome };
}

// ─── 仪表盘头部 · 护栏身份卡 ────────────────────────────────────────────────

export type GuardrailIdentitySnapshot = {
  monthLabel: string;                     // "11 月"
  totalThisMonth: number;
  blockedThisMonth: number;
  warnedThisMonth: number;
  overriddenThisMonth: number;
  totalOverridden: number;                // 全历史
  overriddenLossRate: number | null;       // 覆写后 30 日亏损样本占比 0~100，样本 ≥5 才出
  overriddenAvgReturn: number | null;
  topType: { type: GuardrailEventType; count: number } | null;
};

const MONTH_LABELS = [
  "1 月", "2 月", "3 月", "4 月", "5 月", "6 月",
  "7 月", "8 月", "9 月", "10 月", "11 月", "12 月",
];

export async function getGuardrailIdentity(userId: string): Promise<GuardrailIdentitySnapshot> {
  const monthStart = dayjs().startOf("month");
  const monthStartMs = monthStart.valueOf();

  const monthRows = await db
    .select({
      eventType: guardrailEvents.eventType,
      outcome: guardrailEvents.outcome,
    })
    .from(guardrailEvents)
    .where(
      and(
        eq(guardrailEvents.userId, userId),
        gte(guardrailEvents.createdAt, monthStartMs),
      )
    );

  const totalThisMonth = monthRows.length;
  const blockedThisMonth = monthRows.filter((r) => r.outcome === "BLOCKED").length;
  const warnedThisMonth = monthRows.filter((r) => r.outcome === "WARNED").length;
  const overriddenThisMonth = monthRows.filter((r) => r.outcome === "OVERRIDDEN").length;

  const allRows = await db
    .select({
      eventType: guardrailEvents.eventType,
      outcome: guardrailEvents.outcome,
      decisionRef: guardrailEvents.decisionRef,
    })
    .from(guardrailEvents)
    .where(eq(guardrailEvents.userId, userId));

  const totalOverridden = allRows.filter((r) => r.outcome === "OVERRIDDEN").length;

  // 当月最高频的类型
  const monthTypeCount = new Map<GuardrailEventType, number>();
  for (const r of monthRows) {
    const t = r.eventType as GuardrailEventType;
    monthTypeCount.set(t, (monthTypeCount.get(t) ?? 0) + 1);
  }
  const sortedTypes = [...monthTypeCount.entries()].sort((a, b) => b[1] - a[1]);
  const topType = sortedTypes[0] ? { type: sortedTypes[0][0], count: sortedTypes[0][1] } : null;

  // 覆写后表现：把 OVERRIDDEN 事件的 decisionRef 关联回 decisions 表，看 30 日收益
  let overriddenLossRate: number | null = null;
  let overriddenAvgReturn: number | null = null;

  const overrideDecisionIds = [...new Set(
    allRows
      .filter((r) => r.outcome === "OVERRIDDEN" && r.decisionRef)
      .map((r) => r.decisionRef as string)
  )];

  if (overrideDecisionIds.length > 0) {
    const decisionRows = await db
      .select({
        id: decisions.id,
        return30Days: decisions.return30Days,
      })
      .from(decisions)
      .where(eq(decisions.userId, userId));

    const overrideMap = new Set(overrideDecisionIds);
    const filled = decisionRows.filter(
      (d) => overrideMap.has(d.id) && d.return30Days != null
    );

    if (filled.length >= 5) {
      const lossCount = filled.filter((d) => (d.return30Days ?? 0) < 0).length;
      overriddenLossRate = (lossCount / filled.length) * 100;
      overriddenAvgReturn =
        filled.reduce((s, d) => s + (d.return30Days ?? 0), 0) / filled.length;
    }
  }

  return {
    monthLabel: MONTH_LABELS[monthStart.month()],
    totalThisMonth,
    blockedThisMonth,
    warnedThisMonth,
    overriddenThisMonth,
    totalOverridden,
    overriddenLossRate,
    overriddenAvgReturn,
    topType,
  };
}
