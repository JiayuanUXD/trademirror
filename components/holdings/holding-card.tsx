import Link from "next/link";
import type { Holding } from "@/types/holding";
import { STATUS_LABELS, STATUS_COLORS } from "@/types/holding";

type Props = { holding: Holding };

const STATUS_ACCENT: Record<string, string> = {
  HOLDING: "var(--brand-green)",
  WATCHING: "var(--brand-warning)",
  CLOSED: "var(--border-default)",
};

export function HoldingCard({ holding: h }: Props) {
  const pnlPct =
    h.currentPrice && h.costPrice
      ? ((h.currentPrice - h.costPrice) / h.costPrice) * 100
      : null;

  const amount = h.costPrice * h.shares;
  const accent = STATUS_ACCENT[h.status] ?? "var(--border-subtle)";

  return (
    <Link
      href={`/holdings/${h.id}`}
      className="card-interactive block rounded-xl border p-4 transition-colors"
      style={{ borderLeftWidth: 3, borderLeftColor: accent }}
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm" style={{ color: "var(--foreground)" }}>
              {h.stockName}
            </span>
            <span className="text-xs font-mono" style={{ color: "var(--muted-foreground)" }}>
              {h.stockCode}
            </span>
            {h.sector && (
              <span
                className="text-[10px] px-1.5 py-0.5 rounded-md font-medium"
                style={{
                  backgroundColor: "var(--surface-overlay)",
                  color: "var(--muted-foreground)",
                }}
              >
                {h.sector}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs" style={{ color: "var(--muted-foreground)" }}>
            <span>成本 ¥{h.costPrice.toLocaleString()}</span>
            <span className="opacity-40">·</span>
            <span>{h.shares.toLocaleString()} 股</span>
            <span className="opacity-40">·</span>
            <span>¥{(amount / 10000).toFixed(1)} 万</span>
          </div>
        </div>

        {/* Status + P&L */}
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <span
            className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
            style={{
              color: STATUS_COLORS[h.status],
              backgroundColor: `${STATUS_COLORS[h.status]}1A`,
            }}
          >
            {STATUS_LABELS[h.status]}
          </span>
          {pnlPct !== null && (
            <span
              className="text-xs font-bold tabular-nums"
              style={{
                color: pnlPct >= 0 ? "var(--brand-red)" : "var(--brand-green)",
              }}
            >
              {pnlPct >= 0 ? "+" : ""}{pnlPct.toFixed(2)}%
            </span>
          )}
        </div>
      </div>

      {/* Health score bar */}
      <div className="mt-3 space-y-1">
        <div
          className="flex items-center justify-between"
          style={{ fontSize: "11px", color: "var(--muted-foreground)" }}
        >
          <span>档案健康度</span>
          <span
            className="font-semibold"
            style={{
              color:
                h.healthScore >= 60
                  ? "var(--brand-green)"
                  : h.healthScore >= 30
                  ? "var(--brand-warning)"
                  : "var(--brand-red)",
            }}
          >
            {h.healthScore}
          </span>
        </div>
        <div
          className="h-1 rounded-full overflow-hidden"
          style={{ backgroundColor: "var(--surface-overlay)" }}
        >
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${h.healthScore}%`,
              backgroundColor:
                h.healthScore >= 60
                  ? "var(--brand-green)"
                  : h.healthScore >= 30
                  ? "var(--brand-warning)"
                  : "var(--brand-red)",
            }}
          />
        </div>
      </div>

      {/* Footer */}
      <div
        className="flex items-center gap-4 mt-2.5 pt-2.5"
        style={{ borderTop: "1px solid var(--border-subtle)", fontSize: "11px", color: "var(--muted-foreground)" }}
      >
        <span>{h.logic.reasons.length} 条逻辑</span>
        <span>{h.prerequisites.length} 项前提</span>
        <span>{h.exitConditions.length} 项撤退</span>
        <span
          className="ml-auto font-medium"
          style={{ color: h.exitConditions.length === 0 ? "var(--brand-warning)" : "var(--muted-foreground)" }}
        >
          {h.exitConditions.length === 0 ? "⚠ 无止损" : ""}
        </span>
      </div>
    </Link>
  );
}
