import Link from "next/link";
import { Plus, Star, Target } from "lucide-react";
import { getGoals } from "@/lib/db/queries/goals";
import dayjs from "dayjs";

export const dynamic = "force-dynamic";

const STATUS_CONFIG = {
  ACTIVE:    { label: "进行中", color: "var(--brand-blue)" },
  ACHIEVED:  { label: "已达成", color: "var(--brand-green)" },
  ABANDONED: { label: "已放弃", color: "var(--muted-foreground)" },
} as const;

export default async function GoalsPage() {
  const goals = await getGoals();
  const active = goals.filter((g) => g.status === "ACTIVE");
  const others = goals.filter((g) => g.status !== "ACTIVE");

  return (
    <div className="px-4 py-5 sm:px-6 sm:py-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: "var(--foreground)" }}>目标管理</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--muted-foreground)" }}>
            设定合理的目标，让数字帮你保持清醒
          </p>
        </div>
        <Link href="/goals/new"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
          style={{
            backgroundColor: "rgba(99,102,241,0.12)",
            color: "var(--brand-purple)",
            border: "1px solid rgba(99,102,241,0.25)",
          }}>
          <Plus size={12} />
          新建目标
        </Link>
      </div>

      {goals.length === 0 ? (
        <div className="rounded-xl border py-20 flex flex-col items-center gap-3 text-center"
          style={{ backgroundColor: "var(--surface-card)", borderColor: "var(--border-subtle)" }}>
          <Target size={32} style={{ color: "var(--muted-foreground)", opacity: 0.4 }} />
          <div>
            <p className="text-sm font-medium" style={{ color: "var(--foreground)" }}>还没有设定目标</p>
            <p className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>
              明确的目标是避免冒险操作的第一道防线
            </p>
          </div>
          <Link href="/goals/new"
            className="px-4 py-2 rounded-lg text-xs font-medium"
            style={{ backgroundColor: "rgba(99,102,241,0.15)", color: "var(--brand-purple)", border: "1px solid rgba(99,102,241,0.3)" }}>
            立即设定第一个目标
          </Link>
        </div>
      ) : (
        <>
          {active.length > 0 && (
            <div className="space-y-3">
              <p className="section-label">进行中</p>
              {active.map((g) => <GoalCard key={g.id} goal={g} />)}
            </div>
          )}
          {others.length > 0 && (
            <div className="space-y-3">
              <p className="section-label">已结束</p>
              {others.map((g) => <GoalCard key={g.id} goal={g} />)}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function GoalCard({ goal }: { goal: Awaited<ReturnType<typeof getGoals>>[number] }) {
  const now = Date.now();
  const daysElapsed = (now - goal.createdAt) / (1000 * 60 * 60 * 24);
  const totalDays = goal.years * 365;
  const timePct = Math.min((daysElapsed / totalDays) * 100, 100);
  const latestAmount = goal.checkins[goal.checkins.length - 1]?.amount ?? goal.startAmount;
  const achievedPct = goal.startAmount < goal.targetAmount
    ? Math.max(Math.min(((latestAmount - goal.startAmount) / (goal.targetAmount - goal.startAmount)) * 100, 100), 0)
    : 0;
  const statusCfg = STATUS_CONFIG[goal.status];

  return (
    <Link href={`/goals/${goal.id}`} className="card-interactive block rounded-xl border p-4">
      <div>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold truncate" style={{ color: "var(--foreground)" }}>
                {goal.title}
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded"
                style={{ backgroundColor: "var(--surface-overlay)", color: statusCfg.color }}>
                {statusCfg.label}
              </span>
            </div>
            <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>
              ¥{goal.startAmount.toLocaleString()} → ¥{goal.targetAmount.toLocaleString()} · {goal.years} 年 · {(goal.requiredReturn * 100).toFixed(1)}% 年化
            </p>
          </div>
          <div className="flex gap-0.5 shrink-0">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star key={s} size={12}
                fill={s <= goal.realismScore ? "var(--brand-warning)" : "transparent"}
                style={{ color: "var(--brand-warning)" }} />
            ))}
          </div>
        </div>

        {/* Progress bars */}
        <div className="mt-3 space-y-1.5">
          <div className="flex justify-between text-[10px]" style={{ color: "var(--muted-foreground)" }}>
            <span>目标进度 {achievedPct.toFixed(0)}%</span>
            <span>截止 {dayjs(goal.targetDate).format("YYYY/MM/DD")}</span>
          </div>
          {/* Time progress bar */}
          <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "var(--surface-overlay)" }}>
            <div className="h-full rounded-full"
              style={{ width: `${timePct}%`, backgroundColor: "rgba(99,102,241,0.4)" }} />
          </div>
          {/* Achievement bar */}
          <div className="h-1 rounded-full overflow-hidden" style={{ backgroundColor: "var(--surface-overlay)" }}>
            <div className="h-full rounded-full"
              style={{ width: `${achievedPct}%`, backgroundColor: "var(--brand-green)" }} />
          </div>
        </div>
      </div>
    </Link>
  );
}
