import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getHoldingById } from "@/lib/db/queries/holdings";
import { getDecisions } from "@/lib/db/queries/decisions";
import { HoldingDetailTabs } from "@/components/holdings/holding-detail-tabs";
import { STATUS_LABELS, STATUS_COLORS } from "@/types/holding";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function HoldingDetailPage({ params }: Props) {
  const { id } = await params;
  const [holding, allDecisions] = await Promise.all([
    getHoldingById(id),
    getDecisions(),
  ]);

  if (!holding) notFound();

  // Filter decisions for this stock
  const relatedDecisions = allDecisions.filter(
    (d) => d.stockCode === holding.stockCode
  );

  const pnlPct =
    holding.currentPrice && holding.costPrice
      ? ((holding.currentPrice - holding.costPrice) / holding.costPrice) * 100
      : null;

  const marketValue = (holding.currentPrice ?? holding.costPrice) * holding.shares;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
      <Link
        href="/holdings"
        className="inline-flex items-center gap-1 text-xs transition-colors"
        style={{ color: "var(--muted-foreground)" }}
      >
        <ChevronLeft size={13} />
        持仓库
      </Link>

      {/* Header card */}
      <div
        className="rounded-xl border p-5"
        style={{ backgroundColor: "var(--surface-card)", borderColor: "var(--border-subtle)" }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold" style={{ color: "var(--foreground)" }}>
                {holding.stockName}
              </h1>
              <span className="text-sm" style={{ color: "var(--muted-foreground)" }}>
                {holding.stockCode} · {holding.stockMarket}
              </span>
              {holding.sector && (
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded"
                  style={{ backgroundColor: "var(--surface-overlay)", color: "var(--muted-foreground)" }}
                >
                  {holding.sector}
                </span>
              )}
            </div>

            <div className="flex items-center gap-4 mt-2 text-sm" style={{ color: "var(--muted-foreground)" }}>
              <span>成本 ¥{holding.costPrice.toLocaleString()}</span>
              <span>{holding.shares.toLocaleString()} 股</span>
              <span>¥{(marketValue / 10000).toFixed(1)} 万</span>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <span
              className="text-xs font-medium px-2 py-0.5 rounded-full"
              style={{ color: STATUS_COLORS[holding.status], backgroundColor: `${STATUS_COLORS[holding.status]}22` }}
            >
              {STATUS_LABELS[holding.status]}
            </span>
            {pnlPct !== null && (
              <span
                className="text-base font-bold"
                style={{ color: pnlPct >= 0 ? "var(--brand-red)" : "var(--brand-green)" }}
              >
                {pnlPct >= 0 ? "+" : ""}{pnlPct.toFixed(2)}%
              </span>
            )}
          </div>
        </div>

        {/* Health score */}
        <div className="mt-4 space-y-1">
          <div className="flex items-center justify-between text-xs" style={{ color: "var(--muted-foreground)" }}>
            <span>档案健康度</span>
            <span
              style={{
                color: holding.healthScore >= 60
                  ? "var(--brand-green)"
                  : holding.healthScore >= 30
                  ? "var(--brand-warning)"
                  : "var(--brand-red)",
              }}
            >
              {holding.healthScore}/100
            </span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: "var(--surface-overlay)" }}>
            <div
              className="h-full rounded-full"
              style={{
                width: `${holding.healthScore}%`,
                backgroundColor: holding.healthScore >= 60
                  ? "var(--brand-green)"
                  : holding.healthScore >= 30
                  ? "var(--brand-warning)"
                  : "var(--brand-red)",
              }}
            />
          </div>
          <div className="flex gap-4 text-[11px]" style={{ color: "var(--muted-foreground)" }}>
            <span>逻辑 {holding.logic.reasons.length} 条</span>
            <span>前提 {holding.prerequisites.length} 项</span>
            <span>撤退 {holding.exitConditions.length} 项</span>
            <span>操作 {relatedDecisions.length} 笔</span>
          </div>
        </div>
      </div>

      {/* Detail tabs */}
      <div
        className="rounded-xl border p-5"
        style={{ backgroundColor: "var(--surface-card)", borderColor: "var(--border-subtle)" }}
      >
        <HoldingDetailTabs holding={holding} decisions={relatedDecisions} />
      </div>
    </div>
  );
}
