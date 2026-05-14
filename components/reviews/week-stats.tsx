import type { WeeklyReview } from "@/types/review";
import { AlertTriangle, TrendingUp, FileText } from "lucide-react";

type Props = { review: WeeklyReview };

export function WeekStats({ review: r }: Props) {
  const stats = [
    {
      icon: <FileText size={14} />,
      label: "本周操作",
      value: `${r.weekDecisionCount} 笔`,
      color: "var(--brand-blue)",
    },
    {
      icon: <AlertOctagon size={14} />,
      label: "高危交易",
      value: r.dangerTradeCount === 0 ? "0" : String(r.dangerTradeCount),
      sub: "笔高危操作",
      color: r.dangerTradeCount > 0 ? "var(--brand-warning)" : "var(--color-up)",
    },
    {
      icon: <TrendingUp size={14} />,
      label: "高情绪值",
      value: r.highFomoCount === 0 ? "0" : String(r.highFomoCount),
      sub: "FOMO ≥ 7",
      color: r.highFomoCount > 0 ? "var(--color-down)" : "var(--color-up)",
    },
    {
      icon: <BarChart3 size={14} />,
      label: "盈亏偏离",
      value: `${r.maxDrawdownPct.toFixed(1)}%`,
      sub: "单笔最大回撤",
      color:
        r.maxDrawdownPct <= 5
          ? "var(--color-up)"
          : r.maxDrawdownPct <= 10
          ? "var(--brand-warning)"
          : "var(--color-down)",
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-3">
      {stats.map((s) => (
        <div
          key={s.label}
          className="rounded-lg border px-3 py-3"
          style={{
            backgroundColor: "var(--surface-card)",
            borderColor: "var(--border-subtle)",
          }}
        >
          <div className="flex items-center gap-1.5 mb-1" style={{ color: "var(--muted-foreground)" }}>
            {s.icon}
            <span className="text-xs">{s.label}</span>
          </div>
          <div className="text-lg font-bold" style={{ color: s.color }}>
            {s.value}
          </div>
        </div>
      ))}
    </div>
  );
}
