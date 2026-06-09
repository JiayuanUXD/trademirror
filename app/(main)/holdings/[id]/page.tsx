import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { auth } from "@/auth";
import { getHoldingById } from "@/lib/db/queries/holdings";
import { getDecisionsByStockCode } from "@/lib/db/queries/decisions";
import { HoldingDetailTabs } from "@/components/holdings/holding-detail-tabs";
import { HoldingDetailHeader } from "@/components/holdings/holding-detail-header";
import { StockDigestSection } from "@/components/holdings/stock-digest-section";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function HoldingDetailPage({ params }: Props) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  const { id } = await params;
  const holding = await getHoldingById(id, userId);
  if (!holding) notFound();

  const relatedDecisions = await getDecisionsByStockCode(holding.stockCode, userId);

  return (
    <div className="px-4 py-6 space-y-5">
      <Link
        href="/holdings"
        className="inline-flex items-center gap-1 text-xs transition-colors"
        style={{ color: "var(--muted-foreground)" }}
      >
        <ChevronLeft size={13} />
        持仓库
      </Link>

      {/* Header card — client component for realtime price */}
      <HoldingDetailHeader holding={holding} decisionCount={relatedDecisions.length} />

      {/* 今日盘后分析 — 仅持有中的股票显示 */}
      {holding.status === "HOLDING" && (
        <StockDigestSection stockCode={holding.stockCode} stockName={holding.stockName} />
      )}

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
