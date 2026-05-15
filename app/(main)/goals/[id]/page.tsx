import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Star } from "lucide-react";
import { auth } from "@/auth";
import { getGoalById } from "@/lib/db/queries/goals";
import { GoalProgress } from "@/components/goals/goal-progress";
import dayjs from "dayjs";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

const REALISM_LABELS = ["", "不建议设定", "极有挑战", "需要优秀水平", "有挑战但可达", "非常合理"];

export default async function GoalDetailPage({ params }: Props) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  const { id } = await params;
  const goal = await getGoalById(id, userId);
  if (!goal) notFound();

  const realismLabel = REALISM_LABELS[goal.realismScore] ?? "";
  const starColor = goal.realismScore >= 4
    ? "var(--brand-green)"
    : goal.realismScore >= 3 ? "var(--brand-warning)" : "var(--brand-red)";

  return (
    <div className="p-6 space-y-5">
      <Link href="/goals"
        className="inline-flex items-center gap-1 text-xs transition-colors"
        style={{ color: "var(--muted-foreground)" }}>
        <ChevronLeft size={13} />
        目标列表
      </Link>

      {/* Header */}
      <div className="rounded-xl border p-5"
        style={{ backgroundColor: "var(--surface-card)", borderColor: "var(--border-subtle)" }}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold" style={{ color: "var(--foreground)" }}>{goal.title}</h1>
            {goal.note && (
              <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>{goal.note}</p>
            )}
          </div>
          <div className="text-right shrink-0">
            <div className="flex gap-0.5 justify-end">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} size={14}
                  fill={s <= goal.realismScore ? starColor : "transparent"}
                  style={{ color: starColor }} />
              ))}
            </div>
            <p className="text-[10px] mt-0.5" style={{ color: starColor }}>{realismLabel}</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3 text-center">
          {[
            { label: "起始金额", value: `¥${goal.startAmount.toLocaleString()}` },
            { label: "目标金额", value: `¥${goal.targetAmount.toLocaleString()}` },
            { label: "需要年化", value: `${(goal.requiredReturn * 100).toFixed(1)}%` },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-lg py-2"
              style={{ backgroundColor: "var(--surface-overlay)" }}>
              <div className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>{value}</div>
              <div className="text-[10px] mt-0.5" style={{ color: "var(--muted-foreground)" }}>{label}</div>
            </div>
          ))}
        </div>

        <div className="mt-2 flex justify-between text-[11px]" style={{ color: "var(--muted-foreground)" }}>
          <span>设定于 {dayjs(goal.createdAt).format("YYYY/MM/DD")}</span>
          <span>目标日期 {dayjs(goal.targetDate).format("YYYY/MM/DD")} · {goal.years} 年</span>
        </div>
      </div>

      {/* Progress (client) */}
      <GoalProgress goal={goal} />
    </div>
  );
}
