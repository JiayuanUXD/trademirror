import type { Decision, DangerSignal } from "@/types/decision";
import { RATIONAL_BASIS, ACTION_LABELS } from "@/types/decision";
import { getWeekStart } from "@/lib/week";
import type { WeeklyReview } from "@/types/review";
import dayjs from "dayjs";

export type BasisBreakdownItem = {
  name: string;
  count: number;
  type: "rational" | "irrational";
};

export type FomoDistItem = { score: number; count: number };

export type DangerBreakdownItem = { signal: DangerSignal; count: number };

export type ActionBreakdownItem = { action: string; count: number };

export type WeeklyTrendItem = { week: string; count: number; dangerCount: number };

export type DisciplineTrendItem = { week: string; total: number };

export type EmotionStats = {
  fomoAvg: number;
  calmAvg: number;
  confidenceAvg: number;
};

export type OverviewStats = {
  total: number;
  rationalPct: number;
  fomoAvg: number;
  dangerPct: number;
  avgAmount: number;
};

export function getOverview(decisions: Decision[]): OverviewStats {
  if (decisions.length === 0) {
    return { total: 0, rationalPct: 0, fomoAvg: 0, dangerPct: 0, avgAmount: 0 };
  }
  const rationalCount = decisions.filter((d) =>
    d.basis.every((b) => (RATIONAL_BASIS as string[]).includes(b))
  ).length;
  const fomoAvg = decisions.reduce((s, d) => s + d.fomoScore, 0) / decisions.length;
  const dangerCount = decisions.filter((d) => d.dangerSignals.length > 0).length;
  const avgAmount = decisions.reduce((s, d) => s + d.amount, 0) / decisions.length;
  return {
    total: decisions.length,
    rationalPct: Math.round((rationalCount / decisions.length) * 100),
    fomoAvg: Math.round(fomoAvg * 10) / 10,
    dangerPct: Math.round((dangerCount / decisions.length) * 100),
    avgAmount: Math.round(avgAmount),
  };
}

export function getBasisBreakdown(decisions: Decision[]): BasisBreakdownItem[] {
  const counts: Record<string, number> = {};
  for (const d of decisions) {
    for (const b of d.basis) {
      counts[b] = (counts[b] ?? 0) + 1;
    }
  }
  return Object.entries(counts)
    .map(([name, count]) => ({
      name,
      count,
      type: (RATIONAL_BASIS as string[]).includes(name) ? "rational" : "irrational",
    } as BasisBreakdownItem))
    .sort((a, b) => b.count - a.count);
}

export function getFomoDistribution(decisions: Decision[]): FomoDistItem[] {
  const counts: Record<number, number> = {};
  for (let i = 1; i <= 10; i++) counts[i] = 0;
  for (const d of decisions) {
    counts[d.fomoScore] = (counts[d.fomoScore] ?? 0) + 1;
  }
  return Object.entries(counts).map(([score, count]) => ({
    score: Number(score),
    count,
  }));
}

export function getDangerBreakdown(decisions: Decision[]): DangerBreakdownItem[] {
  const signals: DangerSignal[] = ["FOMO过高", "心态不稳", "不符合体系", "非理性决策依据"];
  return signals.map((signal) => ({
    signal,
    count: decisions.filter((d) => d.dangerSignals.includes(signal)).length,
  }));
}

export function getActionBreakdown(decisions: Decision[]): ActionBreakdownItem[] {
  const counts: Record<string, number> = {};
  for (const d of decisions) {
    const label = ACTION_LABELS[d.action];
    counts[label] = (counts[label] ?? 0) + 1;
  }
  return Object.entries(counts).map(([action, count]) => ({ action, count }));
}

export function getWeeklyTrend(decisions: Decision[]): WeeklyTrendItem[] {
  const byWeek: Record<string, { count: number; dangerCount: number }> = {};
  for (const d of decisions) {
    const ws = getWeekStart(dayjs(d.createdAt));
    const key = ws.format("MM/DD");
    if (!byWeek[key]) byWeek[key] = { count: 0, dangerCount: 0 };
    byWeek[key].count++;
    if (d.dangerSignals.length > 0) byWeek[key].dangerCount++;
  }
  return Object.entries(byWeek)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, v]) => ({ week, ...v }));
}

export function getDisciplineTrend(reviews: WeeklyReview[]): DisciplineTrendItem[] {
  return [...reviews]
    .sort((a, b) => a.weekStart - b.weekStart)
    .map((r) => ({
      week: dayjs(r.weekStart).format("MM/DD"),
      total: r.disciplineTotal,
    }));
}

// FOMO 评分 vs 30 日实际盈亏散点数据
export type FomoVsReturnItem = {
  fomoScore: number;
  return30Days: number; // 百分比，如 8.5 表示 +8.5%
  stockName: string;
  action: string;
  isDanger: boolean;
};

export function getFomoVsReturn(decisions: Decision[]): FomoVsReturnItem[] {
  return decisions
    .filter((d) => d.return30Days !== null && d.return30Days !== undefined)
    .map((d) => ({
      fomoScore: d.fomoScore,
      return30Days: d.return30Days as number,
      stockName: d.stockName,
      action: ACTION_LABELS[d.action] ?? d.action,
      isDanger: d.dangerSignals.length > 0,
    }));
}

export function getEmotionStats(decisions: Decision[]): EmotionStats {
  if (decisions.length === 0) return { fomoAvg: 0, calmAvg: 0, confidenceAvg: 0 };
  const n = decisions.length;
  return {
    fomoAvg: Math.round((decisions.reduce((s, d) => s + d.fomoScore, 0) / n) * 10) / 10,
    calmAvg: Math.round((decisions.reduce((s, d) => s + d.calmScore, 0) / n) * 10) / 10,
    confidenceAvg: Math.round((decisions.reduce((s, d) => s + d.confidenceScore, 0) / n) * 10) / 10,
  };
}
