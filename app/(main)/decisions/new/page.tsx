import { Suspense } from "react";
import { DecisionForm } from "@/components/decisions/decision-form";
import { ChevronLeft, Clock, BookOpen } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getReviewByWeekStart } from "@/lib/db/queries/reviews";
import { getWeekStart, getWeekEnd, formatWeekLabel } from "@/lib/week";
import dayjs from "dayjs";

export const dynamic = "force-dynamic";

async function getLastWeekReviewStatus(userId: string) {
  const lastWeekStart = getWeekStart(dayjs()).subtract(7, "day");
  const weekStart = lastWeekStart.valueOf();
  const weekEnd = getWeekEnd(lastWeekStart).valueOf();
  const review = await getReviewByWeekStart(weekStart, userId);
  return { review, weekStart, weekEnd, label: formatWeekLabel(weekStart) };
}

export default async function NewDecisionPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/login");

  const params = await searchParams;
  const isBackfill = params.mode === "backfill";

  const { review, label } = await getLastWeekReviewStatus(userId);
  const blocked = review !== null && review.status === "DRAFT";

  // Blocked + normal mode → show two-path gate
  if (blocked && !isBackfill) {
    return (
      <div className="px-4 py-6">
        <Link
          href="/decisions"
          className="inline-flex items-center gap-1 text-xs mb-6 transition-colors"
          style={{ color: "var(--muted-foreground)" }}
        >
          <ChevronLeft size={13} />
          决策卡列表
        </Link>

        <div
          className="rounded-xl border p-6 space-y-5"
          style={{
            backgroundColor: "var(--surface-card)",
            borderColor: "rgba(245,158,11,0.35)",
          }}
        >
          {/* Title */}
          <div>
            <h2 className="text-base font-semibold" style={{ color: "var(--foreground)" }}>
              上周复盘未完成
            </h2>
            <p className="text-sm mt-1" style={{ color: "var(--muted-foreground)" }}>
              {label} 的复盘还是草稿状态。在开始新的决策记录前，请先完成它。
            </p>
          </div>

          {/* Divider */}
          <div style={{ borderTop: "1px solid var(--border-subtle)" }} />

          {/* Two paths */}
          <div className="space-y-3">
            {/* Primary: complete review */}
            <Link
              href={`/reviews/${review!.id}`}
              className="flex items-start gap-3 w-full rounded-lg px-4 py-3.5 transition-opacity hover:opacity-90"
              style={{
                backgroundColor: "var(--brand-blue)",
                color: "#fff",
              }}
            >
              <BookOpen size={16} className="mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium">完成上周复盘</p>
                <p className="text-xs mt-0.5 opacity-80">
                  完成后可正常新建决策卡
                </p>
              </div>
            </Link>

            {/* Secondary: backfill historical trades */}
            <Link
              href="/decisions/new?mode=backfill"
              className="flex items-start gap-3 w-full rounded-lg px-4 py-3.5 transition-opacity hover:opacity-80"
              style={{
                backgroundColor: "var(--surface-overlay)",
                border: "1px solid var(--border-subtle)",
                color: "var(--foreground)",
              }}
            >
              <Clock size={16} className="mt-0.5 flex-shrink-0" style={{ color: "var(--brand-warning)" }} />
              <div>
                <p className="text-sm font-medium">补录历史交易</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>
                  先把漏记的交易补上，再去完成复盘，数据更真实
                </p>
              </div>
            </Link>
          </div>

          <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
            这不是惩罚——是让你在每周开始前先看清上周的自己。
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6">
      <Link
        href="/decisions"
        className="inline-flex items-center gap-1 text-xs mb-6 transition-colors"
        style={{ color: "var(--muted-foreground)" }}
      >
        <ChevronLeft size={13} />
        决策卡列表
      </Link>

      {/* Backfill notice banner */}
      {isBackfill && blocked && (
        <div
          className="flex items-start gap-2.5 rounded-lg px-4 py-3 mb-5 text-sm"
          style={{
            backgroundColor: "rgba(245,158,11,0.08)",
            border: "1px solid rgba(245,158,11,0.25)",
            color: "var(--foreground)",
          }}
        >
          <Clock size={14} className="mt-0.5 flex-shrink-0" style={{ color: "var(--brand-warning)" }} />
          <div>
            <span className="font-medium" style={{ color: "var(--brand-warning)" }}>
              历史补录模式
            </span>
            <span className="ml-1.5" style={{ color: "var(--muted-foreground)" }}>
              请填写实际交易日期。补录完成后记得
            </span>
            <Link
              href={`/reviews/${review!.id}`}
              className="ml-1 underline underline-offset-2"
              style={{ color: "var(--brand-blue)" }}
            >
              回去完成上周复盘
            </Link>
            <span style={{ color: "var(--muted-foreground)" }}>。</span>
          </div>
        </div>
      )}

      <div className="mb-6">
        <h1 className="text-lg font-semibold" style={{ color: "var(--foreground)" }}>
          {isBackfill ? "补录历史交易" : "新建决策卡"}
        </h1>
        <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>
          {isBackfill
            ? "记录漏填的交易，让复盘数据更完整"
            : "记录这笔交易前的完整思考，让数据替你诚实"}
        </p>
      </div>

      <div
        className="rounded-xl p-5 border"
        style={{
          backgroundColor: "var(--surface-card)",
          borderColor: "var(--border-subtle)",
        }}
      >
        <Suspense fallback={<div className="h-48 flex items-center justify-center"><div className="text-sm" style={{ color: "var(--muted-foreground)" }}>加载中…</div></div>}>
          <DecisionForm />
        </Suspense>
      </div>
    </div>
  );
}
