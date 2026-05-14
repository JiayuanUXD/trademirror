import Link from "next/link";
import { Plus, AlertTriangle, TrendingUp, TrendingDown } from "lucide-react";
import { getDecisions } from "@/lib/db/queries/decisions";
import { ACTION_LABELS, type DecisionAction } from "@/types/decision";
import dayjs from "dayjs";

export const dynamic = "force-dynamic";

const ACTION_COLORS: Record<DecisionAction, string> = {
  BUY:    "var(--color-up)",
  ADD:    "var(--color-up)",
  SELL:   "var(--color-down)",
  REDUCE: "var(--color-down)",
  CLEAR:  "var(--color-down)",
};

const ACTION_ICONS: Record<DecisionAction, React.ReactNode> = {
  BUY:    <TrendingUp size={11} />,
  ADD:    <TrendingUp size={11} />,
  SELL:   <TrendingDown size={11} />,
  REDUCE: <TrendingDown size={11} />,
  CLEAR:  <TrendingDown size={11} />,
};

export default async function DecisionsPage() {
  const decisions = await getDecisions();

  return (
    <div className="px-4 py-5 sm:px-6 sm:py-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>决策卡</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--muted-foreground)" }}>
            {decisions.length > 0 ? `共 ${decisions.length} 笔记录` : "在下单前记录你的思考"}
          </p>
        </div>
        <Link
          href="/decisions/new"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: "var(--brand-blue)" }}
        >
          <Plus size={14} />
          新建决策卡
        </Link>
      </div>

      {/* Empty state */}
      {decisions.length === 0 && (
        <div
          className="rounded-xl border flex flex-col items-center justify-center py-24 text-center"
          style={{ backgroundColor: "var(--surface-card)", borderColor: "var(--border-subtle)" }}
        >
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center mb-4"
            style={{ backgroundColor: "var(--brand-blue-dim)" }}
          >
            <Plus size={20} style={{ color: "var(--brand-blue)" }} />
          </div>
          <p className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
            还没有决策卡
          </p>
          <p className="text-xs mt-1.5 mb-5" style={{ color: "var(--muted-foreground)" }}>
            在下单前先记录你的思考过程，这是最重要的习惯
          </p>
          <Link
            href="/decisions/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white"
            style={{ backgroundColor: "var(--brand-blue)" }}
          >
            <Plus size={14} />
            创建第一张决策卡
          </Link>
        </div>
      )}

      {/* Decision list */}
      {decisions.length > 0 && (
        <div className="space-y-2">
          {decisions.map((d) => {
            const color = ACTION_COLORS[d.action];
            const hasDanger = d.dangerSignals.length > 0;
            const hasResult = d.return30Days !== null;

            return (
              <Link
                key={d.id}
                href={`/decisions/${d.id}`}
                className="card-interactive rounded-xl border flex items-stretch overflow-hidden"
              >
                {/* Left accent bar */}
                <div className="w-1 shrink-0" style={{ backgroundColor: color }} />

                {/* Content */}
                <div className="flex-1 p-4 flex items-start gap-4 min-w-0">
                  {/* Action badge */}
                  <div
                    className="mt-0.5 flex items-center gap-1 px-2 py-1 rounded-md text-xs font-bold shrink-0"
                    style={{ backgroundColor: `${color}18`, color }}
                  >
                    {ACTION_ICONS[d.action]}
                    {ACTION_LABELS[d.action]}
                  </div>

                  {/* Main info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm" style={{ color: "var(--foreground)" }}>
                        {d.stockName}
                      </span>
                      <span className="text-xs font-mono opacity-60" style={{ color: "var(--muted-foreground)" }}>
                        {d.stockCode}
                      </span>
                      {hasDanger && (
                        <span
                          className="flex items-center gap-0.5 text-[11px] font-medium px-1.5 py-0.5 rounded"
                          style={{
                            color: "var(--brand-warning)",
                            backgroundColor: "rgba(245,158,11,0.12)",
                          }}
                        >
                          <AlertTriangle size={10} />
                          {d.dangerSignals.length} 个危险信号
                        </span>
                      )}
                    </div>
                    <p className="text-xs mt-0.5 truncate" style={{ color: "var(--muted-foreground)" }}>
                      {d.reason}
                    </p>
                    <div
                      className="flex items-center gap-3 mt-1.5 tabular-nums"
                      style={{ fontSize: "11px", color: "var(--muted-foreground)" }}
                    >
                      <span>¥{d.price.toLocaleString()} × {d.quantity.toLocaleString()} 股</span>
                      <span className="opacity-40">·</span>
                      <span>FOMO {d.fomoScore} / 平静 {d.calmScore}</span>
                    </div>
                  </div>

                  {/* Right meta */}
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>
                      {dayjs(d.createdAt).format("MM/DD HH:mm")}
                    </span>
                    {hasResult && (
                      <span
                        className="text-xs font-bold tabular-nums"
                        style={{
                          color: (d.return30Days ?? 0) >= 0 ? "var(--color-up)" : "var(--color-down)",
                        }}
                      >
                        {(d.return30Days ?? 0) >= 0 ? "+" : ""}
                        {((d.return30Days ?? 0) * 100).toFixed(1)}%
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
