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
      icon: <AlertTriangle size={14} />,
      label: "高危交易",
      value: `${r.dangerTradeCount} 笔`,
      color: r.dangerTradeCount > 0 ? "var(--brand-warning)" : "var(--brand-green)",
    },
    {
      icon: <TrendingUp size={14} />,
      label: "高 FOMO",
      value: `${r.highFomoCount} 笔`,
      color: r.highFomoCount > 0 ? "var(--brand-red)" : "var(--brand-green)",
    },
    {
      icon: null,
      label: "纪律分",
      value: `${r.disciplineTotal}/14`,
      color:
        r.disciplineTotal >= 10
          ? "var(--brand-green)"
          : r.disciplineTotal >= 7
          ? "var(--brand-warning)"
          : "var(--brand-red)",
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
