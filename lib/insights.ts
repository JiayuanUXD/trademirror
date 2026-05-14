import type { Decision } from "@/types/decision";
import { RATIONAL_BASIS } from "@/types/decision";
import type { WeeklyReview } from "@/types/review";
import type { Holding } from "@/types/holding";
import dayjs from "dayjs";

export type InsightContext = {
  periodDays: number;
  decisions: {
    total: number;
    dangerCount: number;
    fomoAvg: number;
    calmAvg: number;
    irrationalCount: number;
    rationalCount: number;
    byStock: { name: string; code: string; count: number; dangerCount: number; actions: string[] }[];
    byBasis: { basis: string; count: number; rational: boolean }[];
    dangerBreakdown: { signal: string; count: number }[];
    recentList: { stock: string; action: string; reason: string; fomo: number; danger: string[] }[];
  };
  reviews: {
    completed: number;
    avgDiscipline: number;
    disciplineHistory: { week: string; score: number }[];
    lowDisciplineWeeks: number;
  };
  holdings: {
    active: number;
    names: string[];
  };
};

export function buildInsightContext(
  decisions: Decision[],
  reviews: WeeklyReview[],
  holdings: Holding[],
  days = 30
): InsightContext {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const recent = decisions.filter((d) => d.createdAt >= cutoff);

  // Per-stock breakdown
  const stockMap = new Map<string, { name: string; code: string; count: number; dangerCount: number; actions: string[] }>();
  for (const d of recent) {
    const key = d.stockCode;
    if (!stockMap.has(key)) stockMap.set(key, { name: d.stockName, code: d.stockCode, count: 0, dangerCount: 0, actions: [] });
    const s = stockMap.get(key)!;
    s.count++;
    if (d.dangerSignals.length > 0) s.dangerCount++;
    s.actions.push(d.action);
  }
  const byStock = [...stockMap.values()].sort((a, b) => b.count - a.count).slice(0, 5);

  // Basis breakdown
  const basisMap = new Map<string, number>();
  for (const d of recent) {
    for (const b of d.basis) basisMap.set(b, (basisMap.get(b) ?? 0) + 1);
  }
  const byBasis = [...basisMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([basis, count]) => ({ basis, count, rational: (RATIONAL_BASIS as string[]).includes(basis) }));

  // Danger signal breakdown
  const dangerMap = new Map<string, number>();
  for (const d of recent) {
    for (const s of d.dangerSignals) dangerMap.set(s, (dangerMap.get(s) ?? 0) + 1);
  }
  const dangerBreakdown = [...dangerMap.entries()].map(([signal, count]) => ({ signal, count }));

  const n = recent.length;
  const fomoAvg = n > 0 ? Math.round((recent.reduce((s, d) => s + d.fomoScore, 0) / n) * 10) / 10 : 0;
  const calmAvg = n > 0 ? Math.round((recent.reduce((s, d) => s + d.calmScore, 0) / n) * 10) / 10 : 0;
  const irrationalCount = recent.filter((d) => d.basis.some((b) => !(RATIONAL_BASIS as string[]).includes(b))).length;

  const recentList = recent.slice(0, 8).map((d) => ({
    stock: d.stockName,
    action: d.action,
    reason: d.reason,
    fomo: d.fomoScore,
    danger: d.dangerSignals,
  }));

  // Reviews
  const recentReviews = reviews.filter((r) => r.weekStart >= cutoff);
  const completed = recentReviews.filter((r) => r.status === "COMPLETED");
  const avgDiscipline = completed.length > 0
    ? Math.round(completed.reduce((s, r) => s + r.disciplineTotal, 0) / completed.length * 10) / 10
    : 0;
  const disciplineHistory = completed
    .sort((a, b) => a.weekStart - b.weekStart)
    .map((r) => ({ week: dayjs(r.weekStart).format("MM/DD"), score: r.disciplineTotal }));
  const lowDisciplineWeeks = completed.filter((r) => r.disciplineTotal < 8).length;

  return {
    periodDays: days,
    decisions: {
      total: n,
      dangerCount: recent.filter((d) => d.dangerSignals.length > 0).length,
      fomoAvg,
      calmAvg,
      irrationalCount,
      rationalCount: n - irrationalCount,
      byStock,
      byBasis,
      dangerBreakdown,
      recentList,
    },
    reviews: { completed: completed.length, avgDiscipline, disciplineHistory, lowDisciplineWeeks },
    holdings: {
      active: holdings.filter((h) => h.status === "HOLDING").length,
      names: holdings.filter((h) => h.status === "HOLDING").map((h) => h.stockName).slice(0, 5),
    },
  };
}

export function buildPrompt(ctx: InsightContext): string {
  const { decisions: d, reviews: r, holdings: h } = ctx;
  const ACTION_ZH: Record<string, string> = { BUY: "买入", ADD: "加仓", SELL: "卖出", REDUCE: "减仓", CLEAR: "清仓" };

  const lines: string[] = [
    `你是一个帮助个人投资者做行为复盘的AI助手。请根据以下过去${ctx.periodDays}天的真实交易数据，`,
    `用中文写一份简明的"行为洞察报告"（200字以内）。`,
    ``,
    `【数据摘要】`,
    `- 操作次数：${d.total} 笔 | 高危次数：${d.dangerCount} 笔 | 高危占比：${d.total > 0 ? Math.round(d.dangerCount / d.total * 100) : 0}%`,
    `- FOMO均值：${d.fomoAvg}/10 | 平静度均值：${d.calmAvg}/10`,
    `- 含非理性依据的决策：${d.irrationalCount} 笔 / ${d.total} 笔`,
  ];

  if (d.byStock.length > 0) {
    lines.push(`- 操作最多的股票：${d.byStock.map(s => `${s.name}(${s.count}笔,高危${s.dangerCount}笔)`).join("、")}`);
  }

  if (d.byBasis.length > 0) {
    const irrational = d.byBasis.filter(b => !b.rational);
    if (irrational.length > 0) {
      lines.push(`- 最常见非理性依据：${irrational.map(b => `"${b.basis}"${b.count}次`).join("、")}`);
    }
  }

  if (d.dangerBreakdown.length > 0) {
    lines.push(`- 危险信号构成：${d.dangerBreakdown.map(s => `${s.signal}×${s.count}`).join("、")}`);
  }

  if (r.completed > 0) {
    lines.push(`- 本期完成复盘：${r.completed}次 | 纪律均分：${r.avgDiscipline}/14 | 低分周（<8分）：${r.lowDisciplineWeeks}次`);
  }

  if (h.active > 0) {
    lines.push(`- 当前持仓：${h.active}只（${h.names.join("、")}）`);
  }

  if (d.recentList.length > 0) {
    lines.push(``, `【最近操作摘要】`);
    for (const op of d.recentList.slice(0, 5)) {
      const danger = op.danger.length > 0 ? ` [!]${op.danger.join("/")}` : "";
      lines.push(`- ${ACTION_ZH[op.action] ?? op.action} ${op.stock}：${op.reason}（FOMO=${op.fomo}${danger}）`);
    }
  }

  lines.push(
    ``,
    `【输出要求】`,
    `请用"过去${ctx.periodDays}天的关键发现："开头，输出3-4条简明洞察，每条一行，用数字编号。`,
    `最后一条必须是"建议下步重点："后面跟一个具体的、可操作的行为改进建议。`,
    `语气要直接、数据驱动，不要泛泛而谈，要点名具体问题或具体股票。`,
    `如果数据不足（决策数<3），请说明数据偏少，给出有限建议。`,
  );

  return lines.join("\n");
}
