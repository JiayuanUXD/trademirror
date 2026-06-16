"use client";

import { useState } from "react";
import dayjs from "dayjs";
import type { DailyState, SentimentTrendRow, StageHistoryRow } from "@/lib/db/queries/sentiment";
import type { GuardrailStats } from "@/lib/db/queries/guardrails";
import { StageHeroCard } from "./stage-hero-card";
import { StageHistoryStrip } from "./stage-history-strip";
import { GuardrailStatsCard } from "./guardrail-stats-card";
import { TrendChart } from "./trend-chart";
import { MetricsForm } from "./metrics-form";

type Props = {
  initialLatest: DailyState | null;
  initialTrend: SentimentTrendRow[];
  initialStageHistory: StageHistoryRow[];
  initialGuardrailStats: GuardrailStats;
};

const RANGE_OPTIONS = [14, 30, 60] as const;
type RangeDays = (typeof RANGE_OPTIONS)[number];

export function SentimentDashboard({
  initialLatest,
  initialTrend,
  initialStageHistory,
  initialGuardrailStats,
}: Props) {
  const [latest, setLatest] = useState(initialLatest);
  const [trend, setTrend] = useState(initialTrend);
  const [stageHistory, setStageHistory] = useState(initialStageHistory);
  const [submitting, setSubmitting] = useState(false);
  const [autoFetching, setAutoFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [fetchInfo, setFetchInfo] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(initialLatest === null);
  const [rangeDays, setRangeDays] = useState<RangeDays>(14);
  const [rangeLoading, setRangeLoading] = useState(false);

  async function refetch(days: RangeDays = rangeDays) {
    const res = await fetch(`/api/sentiment?days=${days}`, { cache: "no-store" });
    if (!res.ok) return;
    const json = (await res.json()) as {
      latest: DailyState | null;
      trend: SentimentTrendRow[];
      stageHistory: StageHistoryRow[];
    };
    setLatest(json.latest);
    setTrend(json.trend);
    if (json.stageHistory) setStageHistory(json.stageHistory);
  }

  async function onChangeRange(days: RangeDays) {
    if (days === rangeDays) return;
    setRangeDays(days);
    setRangeLoading(true);
    try {
      await refetch(days);
    } finally {
      setRangeLoading(false);
    }
  }

  async function onSubmit(payload: {
    tradeDate: string;
    limitUpCount: number | null;
    limitDownCount: number | null;
    sealRate: number | null;
    maxConsecBoards: number | null;
    turnoverYi: number | null;
    prevLimitPremium: number | null;
  }) {
    setSubmitting(true);
    try {
      const res = await fetch("/api/sentiment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error ?? "提交失败");
        return;
      }
      await refetch();
      setShowForm(false);
    } finally {
      setSubmitting(false);
    }
  }

  async function autoFetch(force = false) {
    setAutoFetching(true);
    setFetchError(null);
    setFetchInfo(null);
    try {
      const url = force ? "/api/sentiment/fetch?force=1" : "/api/sentiment/fetch";
      const res = await fetch(url, { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFetchError(json.error ?? "自动拉取失败");
        return;
      }
      if (json.skipped) {
        const reason =
          json.reason === "non_trading_day"
            ? "今日非交易日（周末或节假日），已跳过。"
            : "今日已抓取过，未重复拉取。点「强制重抓」可覆盖。";
        setFetchInfo(reason);
        return;
      }
      await refetch();
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : "自动拉取失败");
    } finally {
      setAutoFetching(false);
    }
  }

  const today = dayjs().format("YYYY-MM-DD");
  const latestIsToday = latest?.tradeDate === today;

  return (
    <div className="space-y-5">
      <StageHeroCard latest={latest} latestIsToday={latestIsToday} />

      {stageHistory.length > 0 && <StageHistoryStrip history={stageHistory} />}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
            近 {rangeDays} 日趋势
          </h2>
          <div
            role="tablist"
            aria-label="趋势时间范围"
            className="inline-flex rounded-md border overflow-hidden"
            style={{ borderColor: "var(--border-subtle)" }}
          >
            {RANGE_OPTIONS.map((d) => {
              const active = d === rangeDays;
              return (
                <button
                  key={d}
                  role="tab"
                  aria-selected={active}
                  type="button"
                  onClick={() => onChangeRange(d)}
                  disabled={rangeLoading}
                  className="text-[11px] px-2.5 py-1 transition-colors disabled:opacity-50"
                  style={{
                    backgroundColor: active ? "var(--surface-overlay)" : "transparent",
                    color: active ? "var(--foreground)" : "var(--muted-foreground)",
                    fontWeight: active ? 600 : 400,
                  }}
                >
                  {d}日
                </button>
              );
            })}
          </div>
          {rangeLoading && (
            <span className="text-[11px]" style={{ color: "var(--muted-foreground)" }}>
              加载中…
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => autoFetch(false)}
            disabled={autoFetching || submitting}
            className="text-xs px-3 py-1.5 rounded-md font-medium transition-colors disabled:opacity-50"
            style={{
              backgroundColor: "var(--brand-blue)",
              color: "#fff",
            }}
          >
            {autoFetching ? "拉取中…" : "一键拉取今日（东财）"}
          </button>
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="text-xs px-3 py-1.5 rounded-md border transition-colors"
            style={{
              borderColor: "var(--border-subtle)",
              color: "var(--muted-foreground)",
              backgroundColor: showForm ? "var(--surface-overlay)" : "transparent",
            }}
          >
            {showForm ? "收起手填" : "手动回填"}
          </button>
        </div>
      </div>

      {fetchError && (
        <div
          className="rounded-lg border px-3 py-2 text-xs"
          style={{
            borderColor: "rgba(239,68,68,0.3)",
            backgroundColor: "rgba(239,68,68,0.06)",
            color: "var(--brand-red)",
          }}
        >
          自动拉取失败：{fetchError}。可改用手动回填。
        </div>
      )}

      {fetchInfo && (
        <div
          className="rounded-lg border px-3 py-2 text-xs flex items-center justify-between gap-2"
          style={{
            borderColor: "var(--border-subtle)",
            backgroundColor: "var(--surface-overlay)",
            color: "var(--muted-foreground)",
          }}
        >
          <span>{fetchInfo}</span>
          {fetchInfo.includes("已抓取") && (
            <button
              type="button"
              onClick={() => autoFetch(true)}
              disabled={autoFetching}
              className="text-[11px] px-2 py-1 rounded border transition-colors disabled:opacity-50"
              style={{
                borderColor: "var(--border-subtle)",
                color: "var(--foreground)",
              }}
            >
              强制重抓
            </button>
          )}
        </div>
      )}

      {showForm && (
        <MetricsForm
          defaultDate={today}
          submitting={submitting}
          onSubmit={onSubmit}
        />
      )}

      <TrendChart trend={trend} />

      <GuardrailStatsCard stats={initialGuardrailStats} />
    </div>
  );
}
