"use client";

import type { ScreenerCandidateRow } from "@/lib/db/queries/screener";

const SIGNAL_TAGS = new Set(["放量", "平台突破", "20日新高"]);

export function CandidateRow({ row }: { row: ScreenerCandidateRow }) {
  let tags: string[] = [];
  try {
    tags = JSON.parse(row.reasonTags);
  } catch {
    tags = [];
  }

  return (
    <div
      className="flex items-center justify-between gap-3 py-3 border-b last:border-b-0"
      style={{ borderColor: "var(--border-subtle)" }}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
            {row.name}
          </span>
          <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
            {row.symbol}
          </span>
          {row.score >= 0.7 && (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded font-medium tabular-nums"
              style={{
                backgroundColor: "rgba(245, 158, 11, 0.14)",
                color: "var(--brand-warning)",
              }}
            >
              {row.score.toFixed(2)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {tags.map((t) => {
            const isSignal = SIGNAL_TAGS.has(t);
            return (
              <span
                key={t}
                className="text-[10px] px-1.5 py-0.5 rounded"
                style={{
                  backgroundColor: isSignal
                    ? "rgba(245, 158, 11, 0.14)"
                    : "var(--brand-blue-dim)",
                  color: isSignal
                    ? "var(--brand-warning)"
                    : "var(--brand-blue)",
                }}
              >
                {t}
              </span>
            );
          })}
        </div>
      </div>
      <div className="text-right shrink-0">
        <p className="text-sm font-medium tabular-nums" style={{ color: "var(--foreground)" }}>
          ¥{row.price.toFixed(2)}
        </p>
        <p className="text-[11px] tabular-nums" style={{ color: "var(--muted-foreground)" }}>
          {row.turnoverYi.toFixed(1)}亿 · 换手 {row.turnoverRatePct.toFixed(1)}%
          {row.volumeRatio != null && ` · 量比 ${row.volumeRatio.toFixed(1)}`}
        </p>
      </div>
    </div>
  );
}
