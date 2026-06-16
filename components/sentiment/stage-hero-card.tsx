"use client";

import dayjs from "dayjs";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import type { DailyState } from "@/lib/db/queries/sentiment";
import { STAGE_LABEL, type SentimentStage } from "@/lib/sentiment/stage";

const STAGE_THEME: Record<SentimentStage, { bg: string; fg: string; tone: string }> = {
  ICE: { bg: "rgba(96, 165, 250, 0.12)", fg: "#60A5FA", tone: "冷静观望" },
  REPAIR: { bg: "rgba(139, 92, 246, 0.12)", fg: "#8B5CF6", tone: "缓慢回暖" },
  FERMENT: { bg: "rgba(245, 158, 11, 0.14)", fg: "#F59E0B", tone: "情绪加热" },
  MAIN_RISE: { bg: "rgba(239, 68, 68, 0.14)", fg: "#EF4444", tone: "主升进行" },
  EBB: { bg: "rgba(34, 197, 94, 0.14)", fg: "#22C55E", tone: "情绪退潮" },
};

type Props = {
  latest: DailyState | null;
  latestIsToday: boolean;
};

export function StageHeroCard({ latest, latestIsToday }: Props) {
  if (!latest) {
    return (
      <div
        className="card-surface rounded-xl border p-6"
        style={{ borderColor: "var(--border-subtle)" }}
      >
        <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
          还没有阶段结论。点右上的「回填今日数据」录入三核心指标，系统会自动给出阶段判定。
        </p>
      </div>
    );
  }

  const theme = STAGE_THEME[latest.stage];
  const cap = Math.round(latest.positionCap * 100);
  const metrics = latest.triggerSnapshot.metrics;
  const yest = latest.prevMetrics;

  const metricRows: { label: string; value: string; delta: number | null }[] = [
    {
      label: "涨停家数",
      value: metrics.limitUpCount?.toString() ?? "—",
      delta: deltaOf(metrics.limitUpCount, yest?.limitUpCount),
    },
    {
      label: "封板率",
      value: metrics.sealRate != null ? `${(metrics.sealRate * 100).toFixed(0)}%` : "—",
      delta: deltaOf(metrics.sealRate, yest?.sealRate),
    },
    {
      label: "最高连板",
      value: metrics.maxConsecBoards?.toString() ?? "—",
      delta: deltaOf(metrics.maxConsecBoards, yest?.maxConsecBoards),
    },
    {
      label: "跌停家数",
      value: metrics.limitDownCount?.toString() ?? "—",
      delta: deltaOf(metrics.limitDownCount, yest?.limitDownCount),
    },
    {
      label: "两市成交额",
      value: metrics.turnoverYi != null ? `${formatTurnover(metrics.turnoverYi)}` : "—",
      delta: deltaOf(metrics.turnoverYi, yest?.turnoverYi),
    },
    {
      label: "昨涨停溢价",
      value:
        metrics.prevLimitPremium != null
          ? `${metrics.prevLimitPremium > 0 ? "+" : ""}${metrics.prevLimitPremium.toFixed(2)}%`
          : "—",
      delta: deltaOf(metrics.prevLimitPremium, yest?.prevLimitPremium),
    },
  ];

  return (
    <div
      className="card-surface rounded-xl border p-5 md:p-6"
      style={{ borderColor: "var(--border-subtle)" }}
    >
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span
              className="text-[11px] px-2 py-0.5 rounded-full font-medium"
              style={{ backgroundColor: theme.bg, color: theme.fg }}
            >
              {theme.tone}
            </span>
            {!latestIsToday && (
              <span
                className="text-[11px] px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: "var(--surface-overlay)",
                  color: "var(--muted-foreground)",
                }}
              >
                {dayjs(latest.tradeDate).format("MM-DD")} · 今日待回填
              </span>
            )}
          </div>
          <div className="flex items-baseline gap-3">
            <h2
              className="text-3xl md:text-4xl font-bold tracking-tight"
              style={{ color: theme.fg }}
            >
              {STAGE_LABEL[latest.stage]}
            </h2>
            <span className="text-sm" style={{ color: "var(--muted-foreground)" }}>
              · 总仓位上限 ≤ <span style={{ color: "var(--foreground)" }}>{cap}%</span>
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-5">
        {metricRows.map((m) => (
          <div
            key={m.label}
            className="rounded-lg border p-3"
            style={{ borderColor: "var(--border-subtle)" }}
          >
            <div className="text-[11px] mb-1" style={{ color: "var(--muted-foreground)" }}>
              {m.label}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-lg font-semibold" style={{ color: "var(--foreground)" }}>
                {m.value}
              </span>
              {m.delta !== null && <DeltaArrow delta={m.delta} />}
            </div>
          </div>
        ))}
      </div>

      <div
        className="rounded-lg border p-3 text-xs"
        style={{
          borderColor: "var(--border-subtle)",
          color: "var(--muted-foreground)",
        }}
      >
        <div className="font-medium mb-1.5" style={{ color: "var(--foreground)" }}>
          阶段判定依据
        </div>
        <ul className="space-y-1">
          {latest.triggerSnapshot.triggers.map((t, i) => (
            <li key={i}>· {t}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function deltaOf(today: number | null | undefined, yest: number | null | undefined): number | null {
  if (today == null || yest == null) return null;
  return today - yest;
}

function formatTurnover(yi: number): string {
  if (yi >= 10000) return `${(yi / 10000).toFixed(2)}万亿`;
  return `${yi.toFixed(0)}亿`;
}

function DeltaArrow({ delta }: { delta: number }) {
  if (Math.abs(delta) < 0.0001) {
    return <Minus size={14} style={{ color: "var(--muted-foreground)" }} />;
  }
  if (delta > 0) {
    return <ArrowUp size={14} style={{ color: "var(--color-up)" }} />;
  }
  return <ArrowDown size={14} style={{ color: "var(--color-down)" }} />;
}
