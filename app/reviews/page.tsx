import Link from "next/link";
import { getReviews } from "@/lib/db/queries/reviews";
import { getReviewByWeekStart, createReview } from "@/lib/db/queries/reviews";
import { getWeekStart, getWeekEnd, formatWeekLabel } from "@/lib/week";
import dayjs from "dayjs";
import { AlertTriangle, CheckCircle, Clock } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ReviewsPage() {
  // Ensure current week always has a review entry
  const weekStart = getWeekStart(dayjs()).valueOf();
  const weekEnd = getWeekEnd(dayjs()).valueOf();
  let currentReview = await getReviewByWeekStart(weekStart);
  if (!currentReview) {
    currentReview = await createReview(weekStart, weekEnd);
  }

  const allReviews = await getReviews();

  return (
    <div className="px-4 py-5 sm:px-6 sm:py-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>复盘</h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--muted-foreground)" }}>
          每周日完成复盘，是进步最快的方式
        </p>
      </div>

      {/* Current week CTA */}
      <Link
        href={`/reviews/${currentReview.id}`}
        className="block rounded-xl border p-5 transition-colors group"
        style={{ backgroundColor: "var(--surface-card)", borderColor: "var(--brand-blue)" }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span
                className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                style={{ backgroundColor: "var(--brand-blue-dim)", color: "var(--brand-blue)" }}
              >
                本周
              </span>
              <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                {formatWeekLabel(currentReview.weekStart)}
              </span>
            </div>
            <h2 className="text-base font-semibold" style={{ color: "var(--foreground)" }}>
              {currentReview.status === "COMPLETED" ? "本周复盘已完成" : "本周复盘待完成"}
            </h2>
            <div className="flex gap-4 mt-2 text-xs" style={{ color: "var(--muted-foreground)" }}>
              <span>操作 {currentReview.weekDecisionCount} 笔</span>
              {currentReview.dangerTradeCount > 0 && (
                <span className="flex items-center gap-1" style={{ color: "var(--brand-warning)" }}>
                  <AlertTriangle size={12} /> 高危 {currentReview.dangerTradeCount} 笔
                </span>
              )}
              <span>纪律 {currentReview.disciplineTotal}/14</span>
            </div>
          </div>
          <div
            className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center"
            style={{
              backgroundColor: currentReview.status === "COMPLETED"
                ? "rgba(34,197,94,0.12)"
                : "var(--brand-blue-dim)",
            }}
          >
            {currentReview.status === "COMPLETED"
              ? <CheckCircle size={18} style={{ color: "var(--brand-green)" }} />
              : <Clock size={18} style={{ color: "var(--brand-blue)" }} />}
          </div>
        </div>
      </Link>

      {/* History */}
      {allReviews.length > 1 && (
        <div>
          <p className="section-label mb-3">历史复盘</p>
          <div className="space-y-2">
            {allReviews.slice(1).map((r) => (
              <Link
                key={r.id}
                href={`/reviews/${r.id}`}
                className="card-interactive flex items-center gap-3 rounded-xl border px-4 py-3"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm" style={{ color: "var(--foreground)" }}>
                      {formatWeekLabel(r.weekStart)}
                    </span>
                    {r.status === "COMPLETED"
                      ? <CheckCircle size={13} style={{ color: "var(--brand-green)" }} />
                      : <Clock size={13} style={{ color: "var(--muted-foreground)" }} />}
                  </div>
                  <div className="flex gap-3 mt-0.5 text-[11px]" style={{ color: "var(--muted-foreground)" }}>
                    <span>操作 {r.weekDecisionCount} 笔</span>
                    {r.dangerTradeCount > 0 && (
                      <span style={{ color: "var(--brand-warning)" }}>
                        <AlertTriangle size={10} className="inline mr-0.5" />
                        高危 {r.dangerTradeCount}
                      </span>
                    )}
                    <span
                      style={{
                        color: r.disciplineTotal >= 10
                          ? "var(--brand-green)"
                          : r.disciplineTotal >= 7
                          ? "var(--brand-warning)"
                          : "var(--brand-red)",
                      }}
                    >
                      纪律 {r.disciplineTotal}/14
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
