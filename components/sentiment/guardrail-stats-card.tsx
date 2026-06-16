"use client";

import type { GuardrailStats, GuardrailEventType, GuardrailOutcome } from "@/lib/db/queries/guardrails";

type Props = { stats: GuardrailStats };

const TYPE_META: Record<GuardrailEventType, { label: string; tone: "blocked" | "warning" }> = {
  MISSING_STOP: { label: "未填止损", tone: "blocked" },
  ADD_TO_LOSS: { label: "向下补仓", tone: "blocked" },
  OVER_SINGLE_POS: { label: "单票超限", tone: "blocked" },
  OVER_TOTAL_POS: { label: "总仓位超限", tone: "warning" },
  OVER_DAILY_COUNT: { label: "当日开仓过多", tone: "warning" },
};

const OUTCOME_META: Record<GuardrailOutcome, { label: string; color: string }> = {
  BLOCKED: { label: "已拦截", color: "var(--color-down)" },
  WARNED: { label: "已警告", color: "var(--brand-warning)" },
  OVERRIDDEN: { label: "强行通过", color: "var(--color-up)" },
};

export function GuardrailStatsCard({ stats }: Props) {
  const types = (Object.keys(stats.byType) as GuardrailEventType[])
    .map((t) => ({ type: t, count: stats.byType[t] }))
    .sort((a, b) => b.count - a.count);

  const outcomes = (Object.keys(stats.byOutcome) as GuardrailOutcome[])
    .map((o) => ({ outcome: o, count: stats.byOutcome[o] }));

  if (stats.totalEvents === 0) {
    return (
      <div
        className="card-surface rounded-xl border p-4"
        style={{ borderColor: "var(--border-subtle)" }}
      >
        <h3 className="text-xs font-semibold mb-1" style={{ color: "var(--foreground)" }}>
          护栏触发（近 {stats.totalDays} 日）
        </h3>
        <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
          这段时间没有触发任何护栏。说明纪律执行良好，或者还没产生足够的决策卡。
        </p>
      </div>
    );
  }

  const overriddenRatio =
    stats.totalEvents > 0
      ? Math.round((stats.byOutcome.OVERRIDDEN / stats.totalEvents) * 100)
      : 0;

  return (
    <div
      className="card-surface rounded-xl border p-4 space-y-4"
      style={{ borderColor: "var(--border-subtle)" }}
    >
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-xs font-semibold" style={{ color: "var(--foreground)" }}>
            护栏触发（近 {stats.totalDays} 日）
          </h3>
          <p className="text-[10px] mt-0.5" style={{ color: "var(--muted-foreground)" }}>
            纪律是否被物理锁住——强行通过比例越低越好
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-semibold tabular-nums" style={{ color: "var(--foreground)" }}>
            {stats.totalEvents}
          </div>
          <div className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>
            次触发
          </div>
        </div>
      </div>

      <div>
        <div className="text-[10px] mb-1.5" style={{ color: "var(--muted-foreground)" }}>
          按类型
        </div>
        <div className="space-y-1.5">
          {types.map((t) => {
            const meta = TYPE_META[t.type];
            const pct = stats.totalEvents > 0 ? (t.count / stats.totalEvents) * 100 : 0;
            const barColor = meta.tone === "blocked" ? "var(--color-down)" : "var(--brand-warning)";
            return (
              <div key={t.type} className="flex items-center gap-2 text-[11px]">
                <div className="w-20 truncate" style={{ color: "var(--foreground)" }}>
                  {meta.label}
                </div>
                <div
                  className="flex-1 h-2 rounded-full overflow-hidden"
                  style={{ backgroundColor: "var(--surface-overlay)" }}
                >
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${pct}%`, backgroundColor: barColor }}
                  />
                </div>
                <div className="w-8 text-right tabular-nums" style={{ color: "var(--muted-foreground)" }}>
                  {t.count}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-2 pt-2 border-t" style={{ borderColor: "var(--border-subtle)" }}>
        {outcomes.map((o) => {
          const meta = OUTCOME_META[o.outcome];
          return (
            <span
              key={o.outcome}
              className="inline-flex items-center gap-1 text-[10px]"
              style={{ color: "var(--muted-foreground)" }}
            >
              <span
                className="inline-block w-2 h-2 rounded-full"
                style={{ backgroundColor: meta.color }}
              />
              {meta.label} {o.count}
            </span>
          );
        })}
        {stats.byOutcome.OVERRIDDEN > 0 && (
          <span
            className="ml-auto text-[10px] px-2 py-0.5 rounded"
            style={{
              color: "var(--color-down)",
              backgroundColor: "rgba(239,68,68,0.08)",
            }}
          >
            强行通过 {overriddenRatio}%
          </span>
        )}
      </div>
    </div>
  );
}
