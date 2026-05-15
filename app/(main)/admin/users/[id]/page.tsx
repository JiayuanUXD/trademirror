import { auth } from "@/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getDecisions } from "@/lib/db/queries/decisions";
import { getHoldings } from "@/lib/db/queries/holdings";
import { getReviews } from "@/lib/db/queries/reviews";
import { getOverview, getEmotionStats, getActionBreakdown } from "@/lib/analytics";
import dayjs from "dayjs";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ACTION_LABELS } from "@/types/decision";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export default async function AdminUserDetailPage({ params }: Params) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") return null;

  const { id } = await params;
  const [targetUser] = await db
    .select()
    .from(users)
    .where(eq(users.id, id))
    .limit(1);

  if (!targetUser) notFound();

  const [decisions, holdings, reviews] = await Promise.all([
    getDecisions(id, 200),
    getHoldings(id),
    getReviews(id),
  ]);

  const hasData = decisions.length > 0;
  const overview = getOverview(decisions);
  const emotionStats = getEmotionStats(decisions);
  const actionBreakdown = getActionBreakdown(decisions);
  const activeHoldings = holdings.filter((h) => h.status === "HOLDING").length;
  const dangerCount = decisions.filter((d) => d.dangerSignals.length > 0).length;
  const completedReviews = reviews.filter((r) => r.status === "COMPLETED").length;
  const avgDisciplineTotal =
    completedReviews > 0
      ? Math.round(
          (reviews
            .filter((r) => r.status === "COMPLETED")
            .reduce((s, r) => s + r.disciplineTotal, 0) /
            completedReviews) *
            10
        ) / 10
      : 0;

  return (
    <div className="px-4 py-5 sm:px-6 sm:py-6 space-y-6">
      {/* Admin banner */}
      <div
        className="flex items-center gap-3 rounded-xl border px-4 py-3"
        style={{
          backgroundColor: "rgba(245,158,11,0.07)",
          borderColor: "rgba(245,158,11,0.25)",
        }}
      >
        <span className="text-sm font-semibold" style={{ color: "var(--brand-warning)" }}>
          管理员视图 · 只读
        </span>
        <span className="text-sm" style={{ color: "var(--muted-foreground)" }}>
          正在查看 {targetUser.name || targetUser.email} 的数据
        </span>
        <Link
          href="/admin/users"
          className="ml-auto text-xs font-medium"
          style={{ color: "var(--brand-blue)" }}
        >
          ← 返回用户列表
        </Link>
      </div>

      {/* User info */}
      <div
        className="card-surface rounded-xl border p-4 flex flex-wrap gap-4 items-center"
      >
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shrink-0"
          style={{ backgroundColor: "var(--brand-blue)" }}
        >
          {(targetUser.name || targetUser.email).charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-base font-semibold" style={{ color: "var(--foreground)" }}>
            {targetUser.name || "未设置"}
          </div>
          <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>
            {targetUser.email}
          </div>
        </div>
        <div className="flex gap-3 text-sm">
          <div className="text-center">
            <div className="font-bold" style={{ color: "var(--foreground)" }}>
              {targetUser.role === "admin" ? "管理员" : "普通用户"}
            </div>
            <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>角色</div>
          </div>
          <div className="text-center">
            <div className="font-bold" style={{ color: "var(--foreground)" }}>
              {dayjs(targetUser.createdAt).format("YYYY/MM/DD")}
            </div>
            <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>注册时间</div>
          </div>
        </div>
      </div>

      {!hasData ? (
        <div className="text-center py-16">
          <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
            该用户还没有任何交易记录
          </p>
        </div>
      ) : (
        <>
          {/* Stats cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "总决策数", value: String(decisions.length), sub: "笔记录" },
              { label: "理性决策", value: `${overview.rationalPct}%`, sub: "纯理性依据" },
              { label: "高危交易", value: dangerCount === 0 ? "0" : String(dangerCount), sub: "累计笔数" },
              { label: "活跃持仓", value: String(activeHoldings), sub: "只" },
            ].map((s) => (
              <div key={s.label} className="card-surface rounded-xl px-4 py-4 border">
                <div className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>
                  {s.value}
                </div>
                <div className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>
                  {s.label}
                </div>
                <div
                  className="text-[11px] mt-0.5 opacity-50"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  {s.sub}
                </div>
              </div>
            ))}
          </div>

          {/* Emotion 3D + Discipline */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="card-surface rounded-xl border p-4">
              <h3 className="text-sm font-medium mb-3" style={{ color: "var(--foreground)" }}>
                情绪三维均值
              </h3>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "平静度", value: emotionStats.calmAvg },
                  { label: "信心度", value: emotionStats.confidenceAvg },
                  { label: "FOMO", value: emotionStats.fomoAvg },
                ].map(({ label, value }) => {
                  const color =
                    label === "FOMO"
                      ? value >= 7
                        ? "var(--brand-red)"
                        : value < 5
                        ? "var(--brand-green)"
                        : "var(--brand-warning)"
                      : value >= 6
                      ? "var(--brand-green)"
                      : value <= 4
                      ? "var(--brand-red)"
                      : "var(--brand-warning)";
                  return (
                    <div key={label} className="text-center">
                      <div className="text-xl font-bold" style={{ color }}>
                        {value}
                      </div>
                      <div className="text-xs mt-0.5" style={{ color: "var(--foreground)" }}>
                        {label}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="card-surface rounded-xl border p-4">
              <h3 className="text-sm font-medium mb-3" style={{ color: "var(--foreground)" }}>
                复盘纪律
              </h3>
              <div className="space-y-2">
                {[
                  { label: "已完成复盘", value: `${completedReviews} 次` },
                  { label: "平均纪律分", value: `${avgDisciplineTotal} / 14` },
                ].map((item) => (
                  <div key={item.label} className="flex justify-between">
                    <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                      {item.label}
                    </span>
                    <span className="text-xs font-medium" style={{ color: "var(--foreground)" }}>
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Action breakdown */}
          <div className="card-surface rounded-xl border p-4">
            <h3 className="text-sm font-medium mb-3" style={{ color: "var(--foreground)" }}>
              操作分布
            </h3>
            <div className="grid grid-cols-5 gap-2">
              {actionBreakdown.map(({ action, count: c }) => {
                const pct =
                  actionBreakdown.reduce((s, x) => s + x.count, 0) > 0
                    ? Math.round(
                        (c / actionBreakdown.reduce((s, x) => s + x.count, 0)) * 100
                      )
                    : 0;
                const isBuy = action === "买入" || action === "加仓";
                const color = isBuy ? "var(--color-up)" : "var(--color-down)";
                return (
                  <div key={action} className="text-center">
                    <div
                      className="text-xs font-bold px-1.5 py-0.5 rounded inline-block mb-1"
                      style={{ backgroundColor: `${color}18`, color }}
                    >
                      {action}
                    </div>
                    <div className="text-lg font-bold" style={{ color: "var(--foreground)" }}>
                      {c}
                    </div>
                    <div className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>
                      {pct}%
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent decisions */}
          <div>
            <h3 className="text-sm font-medium mb-3" style={{ color: "var(--foreground)" }}>
              最近决策
            </h3>
            <div className="space-y-2">
              {decisions.slice(0, 10).map((d) => {
                const isBuy = d.action === "BUY" || d.action === "ADD";
                const actionColor = isBuy ? "var(--color-up)" : "var(--color-down)";
                return (
                  <div
                    key={d.id}
                    className="card-surface rounded-lg border px-4 py-3 flex items-center gap-3"
                  >
                    <span
                      className="text-[11px] font-bold px-2 py-1 rounded-md shrink-0"
                      style={{ backgroundColor: `${actionColor}18`, color: actionColor }}
                    >
                      {ACTION_LABELS[d.action]}
                    </span>
                    <span
                      className="text-sm font-semibold w-20 shrink-0"
                      style={{ color: "var(--foreground)" }}
                    >
                      {d.stockName}
                    </span>
                    <span className="flex-1 text-xs truncate" style={{ color: "var(--muted-foreground)" }}>
                      {d.reason}
                    </span>
                    <span
                      className="text-[11px] shrink-0 tabular-nums"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      {dayjs(d.createdAt).format("MM/DD")}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
