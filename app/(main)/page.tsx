import { Suspense } from "react";
import Link from "next/link";
import { Plus, FileText, AlertTriangle, CalendarDays, Clock } from "lucide-react";
import { auth } from "@/auth";
import { getDecisions } from "@/lib/db/queries/decisions";
import { getHoldings } from "@/lib/db/queries/holdings";
import { getReviews, getReviewByWeekStart, createReview } from "@/lib/db/queries/reviews";
import { getWeekStart, getWeekEnd, formatWeekLabel } from "@/lib/week";
import { ACTION_LABELS } from "@/types/decision";
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
import dayjs from "dayjs";

export const dynamic = "force-dynamic";

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 6) return "深夜了，注意休息";
  if (h < 9) return "早安，今天保持纪律";
  if (h < 12) return "上午好，市场开盘了";
  if (h < 14) return "午间，避免追高";
  if (h < 18) return "下午好，冷静操作";
  return "晚上好，复盘一下今天";
}

export default function HomePage() {
  const weekStart = getWeekStart(dayjs()).valueOf();

  return (
    <div className="px-4 py-5 sm:px-6 sm:py-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>
            {getGreeting()}
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--muted-foreground)" }}>
            {formatWeekLabel(weekStart)} · {dayjs().format("YYYY年MM月DD日")}
          </p>
        </div>
        <Link
          href="/decisions/new"
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-white shrink-0"
          style={{ backgroundColor: "var(--brand-blue)" }}
        >
          <Plus size={14} />
          新建决策卡
        </Link>
      </div>

      <Suspense fallback={<DashboardSkeleton />}>
        {/* @ts-expect-error Async Server Component */}
        <DashboardContent weekStart={weekStart} />
      </Suspense>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Banners skeleton */}
      <div className="h-14 rounded-xl border" style={{ backgroundColor: "var(--surface-card)", borderColor: "var(--border-subtle)" }} />
      
      {/* Stats row skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-24 rounded-xl border" style={{ backgroundColor: "var(--surface-card)", borderColor: "var(--border-subtle)" }} />
        ))}
      </div>
      
      {/* Insight Card skeleton */}
      <div className="h-28 rounded-xl border" style={{ backgroundColor: "var(--surface-card)", borderColor: "var(--border-subtle)" }} />
      
      {/* Emotion and Discipline skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="h-44 rounded-xl border" style={{ backgroundColor: "var(--surface-card)", borderColor: "var(--border-subtle)" }} />
        <div className="h-44 rounded-xl border" style={{ backgroundColor: "var(--surface-card)", borderColor: "var(--border-subtle)" }} />
      </div>
      
      {/* Charts skeleton */}
      <div className="h-64 rounded-xl border" style={{ backgroundColor: "var(--surface-card)", borderColor: "var(--border-subtle)" }} />
    </div>
  );
}

async function DashboardContent({ weekStart }: { weekStart: number }) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  const [decisions, holdings, reviews] = await Promise.all([
    getDecisions(userId, { limit: 500 }),
    getHoldings(userId),
    getReviews(userId),
  ]);

  const weekEnd = getWeekEnd(dayjs(weekStart)).valueOf();
  let currentReview = await getReviewByWeekStart(weekStart, userId);
  if (!currentReview) currentReview = await createReview(weekStart, weekEnd, userId);

  const weekDecisions = decisions.filter(
    (d) => d.createdAt >= weekStart && d.createdAt <= weekEnd
  );
  const activeHoldings = holdings.filter((h) => h.status === "HOLDING").length;
  const dangerTotal = decisions.filter((d) => d.dangerSignals.length > 0).length;
  const reviewPending = currentReview.status === "DRAFT";
  const hasData = decisions.length > 0;

  // Analytics data
  const overview = getOverview(decisions);
  const emotionStats = getEmotionStats(decisions);
  const basisBreakdown = getBasisBreakdown(decisions);
  const fomoDistribution = getFomoDistribution(decisions);
  const dangerBreakdown = getDangerBreakdown(decisions);
  const actionBreakdown = getActionBreakdown(decisions);
  const weeklyTrend = getWeeklyTrend(decisions);
  const disciplineTrend = getDisciplineTrend(reviews.filter((r) => r.status === "COMPLETED"));
  const fomoVsReturn = getFomoVsReturn(decisions);

  // Emotion baseline: avg FOMO from last 7 days
  const sevenDaysAgo = dayjs().subtract(7, "day").valueOf();
  const recentDecisions = decisions.filter((d) => d.createdAt >= sevenDaysAgo);
  const recentFomoAvg =
    recentDecisions.length > 0
      ? Math.round((recentDecisions.reduce((s, d) => s + d.fomoScore, 0) / recentDecisions.length) * 10) / 10
      : null;

  // Backfill reminders: decisions needing price follow-up
  const now = Date.now();
  const backfill7 = decisions.filter(
    (d) => d.createdAt < now - 7 * 24 * 3600 * 1000 && d.priceAfter7Days == null
  ).slice(0, 3);
  const backfill30 = decisions.filter(
    (d) => d.createdAt < now - 30 * 24 * 3600 * 1000 && d.priceAfter30Days == null
  ).slice(0, 2);
  const backfillItems = [...backfill30, ...backfill7.filter((d) => !backfill30.includes(d))].slice(0, 3);

  // Weekly discipline snapshot (auto-calculable)
  const disciplineItems = [
    {
      label: "本周操作未超2次",
      pass: weekDecisions.length <= 2,
      detail: `本周 ${weekDecisions.length} 笔`,
    },
    {
      label: "无高危交易",
      pass: weekDecisions.filter((d) => d.dangerSignals.length > 0).length === 0,
      detail: weekDecisions.filter((d) => d.dangerSignals.length > 0).length === 0
        ? "本周全部正常"
        : `${weekDecisions.filter((d) => d.dangerSignals.length > 0).length} 笔高危`,
    },
  ];

  const stats = [
    {
      label: "总决策数",
      value: decisions.length === 0 ? "—" : String(decisions.length),
      sub: "笔记录",
      color: "var(--foreground)",
    },
    {
      label: "本周操作",
      value: String(weekDecisions.length),
      sub: "笔",
      color: weekDecisions.length > 2 ? "var(--brand-warning)" : "var(--foreground)",
    },
    {
      label: "理性决策",
      value: hasData ? `${overview.rationalPct}%` : "—",
      sub: "纯理性依据",
      color: hasData
        ? overview.rationalPct >= 60
          ? "var(--brand-green)"
          : overview.rationalPct >= 40
          ? "var(--brand-warning)"
          : "var(--brand-red)"
        : "var(--foreground)",
    },
    {
      label: "高危交易",
      value: dangerTotal === 0 ? "0" : String(dangerTotal),
      sub: "累计笔数",
      color: dangerTotal > 0 ? "var(--brand-warning)" : "var(--brand-green)",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Banners row */}
      <div className="space-y-2">
        {/* Week review reminder */}
        {reviewPending && (
          <Link
            href={`/reviews/${currentReview.id}`}
            className="flex items-center gap-3 rounded-xl border px-4 py-3 transition-all hover:opacity-90"
            style={{
              backgroundColor: "rgba(245,158,11,0.07)",
              borderColor: "rgba(245,158,11,0.25)",
            }}
          >
            <CalendarDays size={15} className="shrink-0" style={{ color: "var(--brand-warning)" }} />
            <div className="flex-1 min-w-0">
              <span className="text-sm font-semibold" style={{ color: "var(--brand-warning)" }}>
                本周复盘未完成
              </span>
              <span className="text-xs ml-2" style={{ color: "var(--muted-foreground)" }}>
                {formatWeekLabel(weekStart)} · 点击开始 →
              </span>
            </div>
          </Link>
        )}

        {/* Emotion baseline warning */}
        {recentFomoAvg !== null && recentFomoAvg >= 6 && (
          <div
            className="flex items-center gap-3 rounded-xl border px-4 py-3"
            style={{
              backgroundColor: recentFomoAvg >= 7 ? "rgba(239,68,68,0.07)" : "rgba(245,158,11,0.07)",
              borderColor: recentFomoAvg >= 7 ? "rgba(239,68,68,0.25)" : "rgba(245,158,11,0.25)",
            }}
          >
            <AlertTriangle
              size={15}
              className="shrink-0"
              style={{ color: recentFomoAvg >= 7 ? "var(--brand-red)" : "var(--brand-warning)" }}
            />
            <p className="text-sm" style={{ color: recentFomoAvg >= 7 ? "var(--brand-red)" : "var(--brand-warning)" }}>
              近7天 FOMO 均值 <strong>{recentFomoAvg}</strong> 分——情绪偏高，今日操作前请先冷静5分钟
            </p>
          </div>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="card-surface rounded-xl px-4 py-4 border"
          >
            <div className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</div>
            <div className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>{s.label}</div>
            <div className="text-[11px] mt-0.5 opacity-50" style={{ color: "var(--muted-foreground)" }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* AI Insight */}
      <InsightCard />

      {hasData && (
        <>
          {/* Emotion 3D + Discipline snapshot — 2 col grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Emotion summary */}
            <div
              className="card-surface rounded-xl border p-4"
            >
              <h3 className="text-sm font-medium mb-3" style={{ color: "var(--foreground)" }}>情绪三维均值</h3>
              <div className="grid grid-cols-3 gap-3">
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
                      <div className="text-xl font-bold" style={{ color }}>{value}</div>
                      <div className="text-xs mt-0.5" style={{ color: "var(--foreground)" }}>{label}</div>
                      <div className="text-[10px] mt-0.5" style={{ color: "var(--muted-foreground)" }}>{hint}</div>
                      <div className="mt-2 h-1 rounded-full overflow-hidden" style={{ backgroundColor: "var(--surface-overlay)" }}>
                        <div className="h-full rounded-full" style={{ width: `${(value / 10) * 100}%`, backgroundColor: color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Discipline snapshot */}
            <div
              className="card-surface rounded-xl border p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium" style={{ color: "var(--foreground)" }}>本周纪律快照</h3>
                <Link
                  href={`/reviews/${currentReview.id}`}
                  className="text-[11px] font-medium"
                  style={{ color: "var(--brand-blue)" }}
                >
                  完整复盘 →
                </Link>
              </div>
              <div className="space-y-2.5">
                {disciplineItems.map((item) => (
                  <div key={item.label} className="flex items-center gap-2.5">
                    <span
                      className="text-xs font-bold w-4 h-4 rounded-full flex items-center justify-center shrink-0"
                      style={{
                        backgroundColor: item.pass ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.12)",
                        color: item.pass ? "var(--brand-green)" : "var(--brand-red)",
                      }}
                    >
                      {item.pass ? "✓" : "✗"}
                    </span>
                    <span className="text-xs flex-1" style={{ color: "var(--foreground)" }}>
                      {item.label}
                    </span>
                    <span className="text-[11px]" style={{ color: "var(--muted-foreground)" }}>
                      {item.detail}
                    </span>
                  </div>
                ))}
                <div className="flex items-center gap-2.5">
                  <span
                    className="text-xs font-bold w-4 h-4 rounded-full flex items-center justify-center shrink-0"
                    style={{
                      backgroundColor: activeHoldings > 0 ? "rgba(34,197,94,0.15)" : "rgba(148,163,184,0.12)",
                      color: activeHoldings > 0 ? "var(--brand-green)" : "var(--muted-foreground)",
                    }}
                  >
                    {activeHoldings > 0 ? "✓" : "—"}
                  </span>
                  <span className="text-xs flex-1" style={{ color: "var(--foreground)" }}>
                    持仓档案已维护
                  </span>
                  <span className="text-[11px]" style={{ color: "var(--muted-foreground)" }}>
                    {activeHoldings} 只活跃
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Charts */}
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

      {/* Backfill reminders */}
      {backfillItems.length > 0 && (
        <div
          className="card-surface rounded-xl border p-4"
        >
          <div className="flex items-center gap-2 mb-3">
            <Clock size={13} style={{ color: "var(--brand-blue)" }} />
            <h3 className="text-sm font-medium" style={{ color: "var(--foreground)" }}>待回填价格</h3>
            <span className="text-[11px]" style={{ color: "var(--muted-foreground)" }}>
              — 填写后价 FOMO vs 盈亏图才有数据
            </span>
          </div>
          <div className="space-y-2">
            {backfillItems.map((d) => {
              const isBuy = d.action === "BUY" || d.action === "ADD";
              const actionColor = isBuy ? "var(--color-up)" : "var(--color-down)";
              const daysAgo = Math.floor((now - d.createdAt) / (24 * 3600 * 1000));
              const needs7 = d.priceAfter7Days == null && daysAgo >= 7;
              const needs30 = d.priceAfter30Days == null && daysAgo >= 30;
              return (
                <Link
                  key={d.id}
                  href={`/decisions/${d.id}`}
                  className="card-interactive flex items-center gap-3 rounded-lg border px-3 py-2.5"
                >
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0"
                    style={{ backgroundColor: `${actionColor}18`, color: actionColor }}
                  >
                    {ACTION_LABELS[d.action]}
                  </span>
                  <span className="text-sm font-semibold w-16 shrink-0" style={{ color: "var(--foreground)" }}>
                    {d.stockName}
                  </span>
                  <span className="flex-1 text-xs truncate" style={{ color: "var(--muted-foreground)" }}>
                    {d.reason}
                  </span>
                  <div className="flex gap-1 shrink-0">
                    {needs7 && (
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                        style={{ backgroundColor: "rgba(61,142,248,0.12)", color: "var(--brand-blue)" }}
                      >
                        7日价
                      </span>
                    )}
                    {needs30 && (
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                        style={{ backgroundColor: "rgba(139,92,246,0.12)", color: "var(--brand-purple)" }}
                      >
                        30日价
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] shrink-0 tabular-nums" style={{ color: "var(--muted-foreground)" }}>
                    {dayjs(d.createdAt).format("MM/DD")}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent activity */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="section-label">最近活动</p>
          {decisions.length > 5 && (
            <Link href="/decisions" className="text-xs font-medium" style={{ color: "var(--brand-blue)" }}>
              查看全部 →
            </Link>
          )}
        </div>

        {decisions.length === 0 ? (
          <div
            className="card-surface rounded-xl border flex flex-col items-center justify-center py-16 text-center"
          >
            <div
              className="w-11 h-11 rounded-full flex items-center justify-center mb-4"
              style={{ backgroundColor: "var(--brand-blue-dim)" }}
            >
              <FileText size={18} style={{ color: "var(--brand-blue)" }} />
            </div>
            <p className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>还没有任何记录</p>
            <p className="text-xs mt-1 mb-5" style={{ color: "var(--muted-foreground)" }}>
              创建第一张决策卡，开始追踪你的交易
            </p>
            <Link
              href="/decisions/new"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white"
              style={{ backgroundColor: "var(--brand-blue)" }}
            >
              <Plus size={14} />
              新建决策卡
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {decisions.slice(0, 5).map((d) => {
              const isBuy = d.action === "BUY" || d.action === "ADD";
              const actionColor = isBuy ? "var(--color-up)" : "var(--color-down)";
              return (
                <Link
                  key={d.id}
                  href={`/decisions/${d.id}`}
                  className="card-interactive flex items-center gap-3 rounded-xl border px-4 py-3"
                >
                  <span
                    className="text-[11px] font-bold px-2 py-1 rounded-md shrink-0"
                    style={{ backgroundColor: `${actionColor}18`, color: actionColor }}
                  >
                    {ACTION_LABELS[d.action]}
                  </span>
                  <span className="text-sm font-semibold w-20 shrink-0" style={{ color: "var(--foreground)" }}>
                    {d.stockName}
                  </span>
                  <span className="flex-1 text-xs truncate" style={{ color: "var(--muted-foreground)" }}>
                    {d.reason}
                  </span>
                  {d.dangerSignals.length > 0 && (
                     <AlertTriangle size={12} className="shrink-0" style={{ color: "var(--brand-warning)" }} />
                  )}
                  <span className="text-[11px] shrink-0 tabular-nums" style={{ color: "var(--muted-foreground)" }}>
                    {dayjs(d.createdAt).format("MM/DD")}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
