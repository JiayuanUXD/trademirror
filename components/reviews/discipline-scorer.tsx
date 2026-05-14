"use client";

import { AlertTriangle } from "lucide-react";
import type { DisciplineItem, DisciplineScore } from "@/types/review";

type Props = {
  items: DisciplineItem[];
  onChange: (items: DisciplineItem[]) => void;
  locked?: boolean;
};

const SCORE_LABELS: Record<DisciplineScore, string> = {
  0: "没做到",
  1: "部分",
  2: "做到了",
};

const SCORE_COLORS: Record<DisciplineScore, string> = {
  0: "var(--brand-red)",
  1: "var(--brand-warning)",
  2: "var(--brand-green)",
};

export function DisciplineScorer({ items, onChange, locked = false }: Props) {
  function setScore(id: string, score: DisciplineScore) {
    if (locked) return;
    onChange(items.map((item) => (item.id === id ? { ...item, score } : item)));
  }

  const total = items.reduce((s, i) => s + i.score, 0);

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div
          key={item.id}
          className="flex items-center gap-3 rounded-lg border px-3 py-2.5"
          style={{
            backgroundColor: "var(--surface-overlay)",
            borderColor: "var(--border-subtle)",
          }}
        >
          <span className="flex-1 text-sm" style={{ color: "var(--foreground)" }}>
            {item.label}
          </span>
          {item.autoSuggested !== undefined && item.autoSuggested !== item.score && (
            <span className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>
              建议 {item.autoSuggested}
            </span>
          )}
          <div className="flex gap-1">
            {([0, 1, 2] as DisciplineScore[]).map((s) => {
              const isActive = item.score === s;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setScore(item.id, s)}
                  disabled={locked}
                  className="px-2 py-1 rounded text-[11px] font-medium transition-colors disabled:cursor-default"
                  style={{
                    backgroundColor: isActive ? `${SCORE_COLORS[s]}22` : "transparent",
                    color: isActive ? SCORE_COLORS[s] : "var(--muted-foreground)",
                    border: `1px solid ${isActive ? SCORE_COLORS[s] : "var(--border-subtle)"}`,
                  }}
                >
                  {SCORE_LABELS[s]}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {/* Total */}
      <div className="flex items-center justify-between px-3 py-2 rounded-lg" style={{ backgroundColor: "var(--surface-card)" }}>
        <span className="text-sm font-medium" style={{ color: "var(--foreground)" }}>纪律总分</span>
        <div className="flex items-center gap-2">
          <div className="w-24 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "var(--surface-overlay)" }}>
            <div
              className="h-full rounded-full"
              style={{
                width: `${(total / 14) * 100}%`,
                backgroundColor:
                  total >= 10 ? "var(--brand-green)" : total >= 7 ? "var(--brand-warning)" : "var(--brand-red)",
              }}
            />
          </div>
          <span
            className="text-sm font-bold"
            style={{
              color: total >= 10 ? "var(--brand-green)" : total >= 7 ? "var(--brand-warning)" : "var(--brand-red)",
            }}
          >
            {total}/14
          </span>
        </div>
      </div>

      {total < 8 && (
        <div
          className="text-xs px-3 py-2 rounded-lg flex items-center gap-2"
          style={{ backgroundColor: "rgba(239,68,68,0.08)", color: "var(--brand-red)", border: "1px solid rgba(239,68,68,0.2)" }}
        >
          <AlertTriangle size={14} /> 纪律分低于 8，建议本周暂停交易，冷静复盘
        </div>
      )}
    </div>
  );
}
