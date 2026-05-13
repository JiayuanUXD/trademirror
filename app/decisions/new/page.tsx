import { DecisionForm } from "@/components/decisions/decision-form";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { getReviewByWeekStart } from "@/lib/db/queries/reviews";
import { getWeekStart, getWeekEnd, formatWeekLabel } from "@/lib/week";
import dayjs from "dayjs";

export const dynamic = "force-dynamic";

async function getLastWeekReviewStatus() {
  const lastWeekStart = getWeekStart(dayjs()).subtract(7, "day");
  const weekStart = lastWeekStart.valueOf();
  const weekEnd = getWeekEnd(lastWeekStart).valueOf();
  const review = await getReviewByWeekStart(weekStart);
  return { review, weekStart, weekEnd, label: formatWeekLabel(weekStart) };
}

export default async function NewDecisionPage() {
  const { review, weekStart, label } = await getLastWeekReviewStatus();
  const blocked = review !== null && review.status === "DRAFT";

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <Link
        href="/decisions"
        className="inline-flex items-center gap-1 text-xs mb-6 transition-colors"
        style={{ color: "var(--muted-foreground)" }}
      >
        <ChevronLeft size={13} />
        决策卡列表
      </Link>

      {blocked ? (
        <div
          className="rounded-xl border p-6 text-center space-y-4"
          style={{ backgroundColor: "var(--surface-card)", borderColor: "rgba(245,158,11,0.4)" }}
        >
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center mx-auto"
            style={{ backgroundColor: "rgba(245,158,11,0.12)" }}
          >
            <span className="text-2xl">🔒</span>
          </div>
          <div>
            <h2 className="text-base font-semibold" style={{ color: "var(--foreground)" }}>
              上周复盘未完成
            </h2>
            <p className="text-sm mt-1.5" style={{ color: "var(--muted-foreground)" }}>
              {label} 的复盘还未完成。
              <br />
              完成复盘，才能开始新的决策记录。
            </p>
            <p className="text-xs mt-2" style={{ color: "var(--muted-foreground)" }}>
              这不是惩罚——是让你在每周开始前先看清上周的自己。
            </p>
          </div>
          <Link
            href={`/reviews/${review!.id}`}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-white"
            style={{ backgroundColor: "var(--brand-blue)" }}
          >
            去完成上周复盘 →
          </Link>
        </div>
      ) : (
        <>
          <div className="mb-6">
            <h1 className="text-lg font-semibold" style={{ color: "var(--foreground)" }}>
              新建决策卡
            </h1>
            <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>
              记录这笔交易前的完整思考，让数据替你诚实
            </p>
          </div>

          <div
            className="rounded-xl p-5 border"
            style={{
              backgroundColor: "var(--surface-card)",
              borderColor: "var(--border-subtle)",
            }}
          >
            <DecisionForm />
          </div>
        </>
      )}
    </div>
  );
}
