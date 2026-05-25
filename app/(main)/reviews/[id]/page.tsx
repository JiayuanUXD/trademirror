import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, AlertTriangle } from "lucide-react";
import { auth } from "@/auth";
import { getReviewById } from "@/lib/db/queries/reviews";
import { getDecisions } from "@/lib/db/queries/decisions";
import { WeekStats } from "@/components/reviews/week-stats";
import { ReviewForm } from "@/components/reviews/review-form";
import { formatWeekLabel } from "@/lib/week";
import dayjs from "dayjs";
import { ACTION_LABELS } from "@/types/decision";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function ReviewDetailPage({ params }: Props) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  const { id } = await params;
  const [review, allDecisions] = await Promise.all([
    getReviewById(id, userId),
    getDecisions(userId),
  ]);
  if (!review) notFound();

  const weekDecisions = allDecisions.filter((d) => {
    const ts = d.tradedAt ?? d.createdAt;
    return ts >= review.weekStart && ts <= review.weekEnd;
  });

  return (
    <div className="px-4 py-6 space-y-6">
      <div>
        <Link
          href="/reviews"
          className="inline-flex items-center gap-1 text-xs mb-4 transition-colors"
          style={{ color: "var(--muted-foreground)" }}
        >
          <ChevronLeft size={13} />
          复盘列表
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold" style={{ color: "var(--foreground)" }}>
            {formatWeekLabel(review.weekStart)}
          </h1>
          {review.status === "COMPLETED" && (
            <span
              className="text-[11px] px-2 py-0.5 rounded-full font-medium"
              style={{ backgroundColor: "rgba(34,197,94,0.12)", color: "var(--brand-green)" }}
            >
              已完成
            </span>
          )}
        </div>
      </div>

      {/* Auto stats */}
      <WeekStats review={review} />

      {/* This week's decisions */}
      {weekDecisions.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>
            本周操作记录
          </p>
          {weekDecisions.map((d) => {
            const isBuy = d.action === "BUY" || d.action === "ADD";
            const color = isBuy ? "var(--color-up)" : "var(--color-down)";
            return (
              <div
                key={d.id}
                className="flex items-start gap-3 rounded-lg border px-3 py-2.5"
                style={{ backgroundColor: "var(--surface-card)", borderColor: "var(--border-subtle)" }}
              >
                <span
                  className="text-[11px] font-bold px-1.5 py-0.5 rounded shrink-0 mt-0.5"
                  style={{ backgroundColor: `${color}22`, color }}
                >
                  {ACTION_LABELS[d.action]}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium" style={{ color: "var(--foreground)" }}>{d.stockName}</span>
                    {d.dangerSignals.length > 0 && (
                      <span className="text-[11px] flex items-center gap-0.5" style={{ color: "var(--brand-warning)" }}>
                        <AlertTriangle size={10} /> {d.dangerSignals.join(" · ")}
                      </span>
                    )}
                  </div>
                  <p className="text-xs truncate mt-0.5" style={{ color: "var(--muted-foreground)" }}>{d.reason}</p>
                </div>
                <span className="text-[11px] shrink-0" style={{ color: "var(--muted-foreground)" }}>
                  {dayjs(d.tradedAt ?? d.createdAt).format("MM/DD")}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Review form */}
      <div
        className="rounded-xl border p-5"
        style={{ backgroundColor: "var(--surface-card)", borderColor: "var(--border-subtle)" }}
      >
        <ReviewForm review={review} />
      </div>
    </div>
  );
}
