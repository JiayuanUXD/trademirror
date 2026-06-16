"use client";

import { useState, useEffect } from "react";
import { BarChart3 } from "lucide-react";

type TagStat = {
  tag: string;
  sampleCount: number;
  filledCount: number;
  winRateT1: number | null;
  winRateT3: number | null;
  winRateT5: number | null;
  avgRetT1: number | null;
  avgRetT3: number | null;
  avgRetT5: number | null;
};

type Stats = {
  totalCandidates: number;
  totalFilled: number;
  overall: {
    winRateT1: number | null;
    avgRetT1: number | null;
    winRateT3: number | null;
    avgRetT3: number | null;
    winRateT5: number | null;
    avgRetT5: number | null;
  };
  byTag: TagStat[];
};

const MIN_SHOW = 30;

export function VerificationPanel() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/screener/stats")
      .then((r) => r.json())
      .then((d) => setStats(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div
        className="card-surface rounded-xl border p-5"
        style={{ borderColor: "var(--border-subtle)" }}
      >
        <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
          加载验证数据…
        </p>
      </div>
    );
  }

  if (!stats || stats.totalCandidates === 0) {
    return (
      <div
        className="card-surface rounded-xl border p-5"
        style={{ borderColor: "var(--border-subtle)" }}
      >
        <div className="flex items-center gap-2 mb-2">
          <BarChart3 size={14} style={{ color: "var(--muted-foreground)" }} />
          <h3 className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>
            验证回路
          </h3>
        </div>
        <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
          候选积累后自动回填 T+1/T+3/T+5 收益，此处展示历史胜率。
        </p>
      </div>
    );
  }

  const showOverall = stats.totalFilled >= MIN_SHOW;

  return (
    <div
      className="card-surface rounded-xl border p-5 space-y-4"
      style={{ borderColor: "var(--border-subtle)" }}
    >
      <div className="flex items-center gap-2">
        <BarChart3 size={14} style={{ color: "var(--muted-foreground)" }} />
        <h3 className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>
          验证回路
        </h3>
        <span className="text-[10px] ml-auto" style={{ color: "var(--muted-foreground)" }}>
          {stats.totalFilled} / {stats.totalCandidates} 已回填
        </span>
      </div>

      {!showOverall ? (
        <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
          样本不足 {MIN_SHOW} 只，暂不显示胜率。当前已回填 {stats.totalFilled} 只，继续积累中。
        </p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            <MetricCell label="T+1 胜率" value={stats.overall.winRateT1} suffix="%" />
            <MetricCell label="T+3 胜率" value={stats.overall.winRateT3} suffix="%" />
            <MetricCell label="T+5 胜率" value={stats.overall.winRateT5} suffix="%" />
            <MetricCell label="T+1 均收益" value={stats.overall.avgRetT1} suffix="%" colored />
            <MetricCell label="T+3 均收益" value={stats.overall.avgRetT3} suffix="%" colored />
            <MetricCell label="T+5 均收益" value={stats.overall.avgRetT5} suffix="%" colored />
          </div>

          {stats.byTag.filter((t) => t.filledCount >= MIN_SHOW).length > 0 && (
            <div>
              <p
                className="text-[11px] font-medium mb-2"
                style={{ color: "var(--muted-foreground)" }}
              >
                按信号标签
              </p>
              <div className="space-y-2">
                {stats.byTag
                  .filter((t) => t.filledCount >= MIN_SHOW)
                  .map((t) => (
                    <TagRow key={t.tag} stat={t} />
                  ))}
              </div>
            </div>
          )}

          {stats.byTag.filter((t) => t.filledCount >= 7 && t.filledCount < MIN_SHOW).length > 0 && (
            <div>
              <p
                className="text-[11px] mb-1"
                style={{ color: "var(--muted-foreground)" }}
              >
                积累中（样本 7~29，仅展示均收益）
              </p>
              <div className="space-y-1">
                {stats.byTag
                  .filter((t) => t.filledCount >= 7 && t.filledCount < MIN_SHOW)
                  .map((t) => (
                    <div key={t.tag} className="flex items-center justify-between text-xs">
                      <span style={{ color: "var(--muted-foreground)" }}>
                        {t.tag}
                        <span className="ml-1 text-[10px]">({t.filledCount})</span>
                      </span>
                      <span className="tabular-nums" style={{ color: "var(--muted-foreground)" }}>
                        T+5 {t.avgRetT5 != null ? `${t.avgRetT5 > 0 ? "+" : ""}${t.avgRetT5.toFixed(2)}%` : "—"}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function MetricCell({
  label,
  value,
  suffix,
  colored,
}: {
  label: string;
  value: number | null;
  suffix?: string;
  colored?: boolean;
}) {
  const display = value != null ? `${value > 0 && colored ? "+" : ""}${value.toFixed(1)}${suffix ?? ""}` : "—";
  const color =
    colored && value != null
      ? value > 0
        ? "var(--color-up)"
        : value < 0
          ? "var(--color-down)"
          : "var(--foreground)"
      : "var(--foreground)";

  return (
    <div className="text-center">
      <p className="text-[11px]" style={{ color: "var(--muted-foreground)" }}>
        {label}
      </p>
      <p className="text-sm font-medium tabular-nums" style={{ color }}>
        {display}
      </p>
    </div>
  );
}

function TagRow({ stat }: { stat: TagStat }) {
  return (
    <div
      className="flex items-center justify-between py-1.5 border-b last:border-b-0 text-xs"
      style={{ borderColor: "var(--border-subtle)" }}
    >
      <div className="flex items-center gap-2">
        <span style={{ color: "var(--foreground)" }}>{stat.tag}</span>
        <span className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>
          ({stat.filledCount})
        </span>
      </div>
      <div className="flex items-center gap-3 tabular-nums">
        <WinCell label="T1" rate={stat.winRateT1} avg={stat.avgRetT1} />
        <WinCell label="T3" rate={stat.winRateT3} avg={stat.avgRetT3} />
        <WinCell label="T5" rate={stat.winRateT5} avg={stat.avgRetT5} />
      </div>
    </div>
  );
}

function WinCell({ label, rate, avg }: { label: string; rate: number | null; avg: number | null }) {
  if (rate == null) return <span style={{ color: "var(--muted-foreground)" }}>{label} —</span>;
  const color = avg != null && avg > 0 ? "var(--color-up)" : avg != null && avg < 0 ? "var(--color-down)" : "var(--foreground)";
  return (
    <span style={{ color }}>
      {label} {rate.toFixed(0)}%
    </span>
  );
}
