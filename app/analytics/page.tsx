import { getDecisions } from "@/lib/db/queries/decisions";
import { getReviews } from "@/lib/db/queries/reviews";
import {
  getOverview,
  getBasisBreakdown,
  getFomoDistribution,
  getDangerBreakdown,
  getActionBreakdown,
  getWeeklyTrend,
  getDisciplineTrend,
  getEmotionStats,
  getFomoVsReturn,
} from "@/lib/analytics";
import { ChartsClient } from "@/components/analytics/charts-client";
import { InsightCard } from "@/components/analytics/insight-card";

export const dynamic = "force-dynamic";

function StatCard({ label, value, sub, color }: { label: string; value: string; sub: string; color?: string }) {
  return (
    <div className="rounded-lg border px-4 py-3" style={{ backgroundColor: "var(--surface-card)", borderColor: "var(--border-subtle)" }}>
      <div className="text-2xl font-bold" style={{ color: color ?? "var(--foreground)" }}>{value}</div>
      <div className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>{label}</div>
      <div className="text-[11px] mt-0.5 opacity-50" style={{ color: "var(--muted-foreground)" }}>{sub}</div>
    </div>
  );
}

export default async function AnalyticsPage() {
  const [decisions, reviews] = await Promise.all([getDecisions(500), getReviews()]);

  const overview = getOverview(decisions);
  const emotionStats = getEmotionStats(decisions);
  const basisBreakdown = getBasisBreakdown(decisions);
  const fomoDistribution = getFomoDistribution(decisions);
  const dangerBreakdown = getDangerBreakdown(decisions);
  const actionBreakdown = getActionBreakdown(decisions);
  const weeklyTrend = getWeeklyTrend(decisions);
  const disciplineTrend = getDisciplineTrend(reviews.filter((r) => r.status === "COMPLETED"));
  const fomoVsReturn = getFomoVsReturn(decisions);

  const hasData = decisions.length > 0;

  return (
    <div className="px-4 py-5 sm:px-6 sm:py-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>数据分析</h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--muted-foreground)" }}>
          数据不说谎，它只是揭穿幻觉
        </p>
      </div>

      {/* AI Insight — always shown */}
      <InsightCard />

      {!hasData ? (
        <div
          className="rounded-xl border flex flex-col items-center justify-center py-20 text-center"
          style={{ backgroundColor: "var(--surface-card)", borderColor: "var(--border-subtle)" }}
        >
          <p className="text-sm font-medium" style={{ color: "var(--foreground)" }}>还没有足够的数据</p>
          <p className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>
            记录至少一笔决策后，这里将呈现你的交易行为分析
          </p>
        </div>
      ) : (
        <>
          {/* Overview stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="总决策数" value={String(overview.total)} sub="笔记录" />
            <StatCard
              label="理性决策占比"
              value={`${overview.rationalPct}%`}
              sub="纯理性依据"
              color={overview.rationalPct >= 60 ? "var(--brand-green)" : overview.rationalPct >= 40 ? "var(--brand-warning)" : "var(--brand-red)"}
            />
            <StatCard
              label="FOMO 均值"
              value={String(overview.fomoAvg)}
              sub="越低越好（满分10）"
              color={overview.fomoAvg >= 7 ? "var(--brand-red)" : overview.fomoAvg >= 5 ? "var(--brand-warning)" : "var(--brand-green)"}
            />
            <StatCard
              label="高危交易占比"
              value={`${overview.dangerPct}%`}
              sub="含危险信号"
              color={overview.dangerPct === 0 ? "var(--brand-green)" : overview.dangerPct >= 30 ? "var(--brand-red)" : "var(--brand-warning)"}
            />
          </div>

          {/* Emotion summary */}
          <div className="rounded-xl border p-4" style={{ backgroundColor: "var(--surface-card)", borderColor: "var(--border-subtle)" }}>
            <h3 className="text-sm font-medium mb-3" style={{ color: "var(--foreground)" }}>情绪三维均值</h3>
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "平静度", value: emotionStats.calmAvg, hint: "越高越好", invert: false },
                { label: "信心度", value: emotionStats.confidenceAvg, hint: "适中为佳", invert: false },
                { label: "FOMO", value: emotionStats.fomoAvg, hint: "越低越好", invert: true },
              ].map(({ label, value, hint, invert }) => {
                const good = invert ? value < 5 : value >= 6;
                const bad = invert ? value >= 7 : value <= 4;
                const color = good ? "var(--brand-green)" : bad ? "var(--brand-red)" : "var(--brand-warning)";
                return (
                  <div key={label} className="text-center">
                    <div className="text-2xl font-bold" style={{ color }}>{value}</div>
                    <div className="text-xs mt-0.5" style={{ color: "var(--foreground)" }}>{label}</div>
                    <div className="text-[11px] mt-0.5" style={{ color: "var(--muted-foreground)" }}>{hint}</div>
                    <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "var(--surface-overlay)" }}>
                      <div className="h-full rounded-full" style={{ width: `${(value / 10) * 100}%`, backgroundColor: color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Charts — client-rendered to avoid Recharts SSR warnings */}
          <ChartsClient
            basisBreakdown={basisBreakdown}
            fomoDistribution={fomoDistribution}
            dangerBreakdown={dangerBreakdown}
            actionBreakdown={actionBreakdown}
            weeklyTrend={weeklyTrend}
            disciplineTrend={disciplineTrend}
            disciplineTrendHint={disciplineTrend.length === 0 ? "尚无复盘数据" : "满分 14 · 仅统计已完成复盘"}
            fomoVsReturn={fomoVsReturn}
          />
        </>
      )}
    </div>
  );
}
