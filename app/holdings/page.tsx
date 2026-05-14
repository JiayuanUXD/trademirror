import Link from "next/link";
import { Plus } from "lucide-react";
import { getHoldings } from "@/lib/db/queries/holdings";
import { HoldingCard } from "@/components/holdings/holding-card";

export const dynamic = "force-dynamic";

export default async function HoldingsPage() {
  const holdings = await getHoldings();
  const active = holdings.filter((h) => h.status !== "CLOSED");
  const closed = holdings.filter((h) => h.status === "CLOSED");

  return (
    <div className="px-4 py-5 sm:px-6 sm:py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>持仓库</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--muted-foreground)" }}>
            {active.length > 0 ? `${active.length} 只持有/观察中` : "暂无持仓"}
          </p>
        </div>
        <Link
          href="/holdings/new"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium text-white"
          style={{ backgroundColor: "var(--brand-blue)" }}
        >
          <Plus size={14} />
          新建档案
        </Link>
      </div>

      {holdings.length === 0 && (
        <div
          className="rounded-lg border flex flex-col items-center justify-center py-20 text-center"
          style={{ backgroundColor: "var(--surface-card)", borderColor: "var(--border-subtle)" }}
        >
          <p className="text-sm font-medium" style={{ color: "var(--foreground)" }}>还没有持仓档案</p>
          <p className="text-xs mt-1 mb-4" style={{ color: "var(--muted-foreground)" }}>
            为每只股票建立一份成长档案，记录持有逻辑和撤退条件
          </p>
          <Link
            href="/holdings/new"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium text-white"
            style={{ backgroundColor: "var(--brand-blue)" }}
          >
            <Plus size={14} />
            新建第一份档案
          </Link>
        </div>
      )}

      {active.length > 0 && (
        <div className="space-y-2">
          {active.map((h) => <HoldingCard key={h.id} holding={h} />)}
        </div>
      )}

      {closed.length > 0 && (
        <div>
          <p className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: "var(--muted-foreground)" }}>
            已清仓
          </p>
          <div className="space-y-2 opacity-60">
            {closed.map((h) => <HoldingCard key={h.id} holding={h} />)}
          </div>
        </div>
      )}
    </div>
  );
}
