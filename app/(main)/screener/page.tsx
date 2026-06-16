import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getHistoryWithCandidates } from "@/lib/db/queries/screener";
import { PoolCard } from "@/components/screener/pool-card";
import { StrategyInfo } from "@/components/screener/strategy-info";
import { VerificationPanel } from "@/components/screener/verification-panel";
import { HistoryTimeline } from "@/components/screener/history-timeline";

export const dynamic = "force-dynamic";

export default async function ScreenerPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const history = await getHistoryWithCandidates(session.user.id, 14);
  const initial = history[0] ?? null;

  return (
    <div className="px-4 md:px-8 py-6 md:py-8 max-w-3xl mx-auto space-y-6">
      <header>
        <div className="flex items-center gap-2">
          <h1 className="text-xl md:text-2xl font-semibold" style={{ color: "var(--foreground)" }}>
            选股漏斗
          </h1>
          <StrategyInfo />
        </div>
        <p className="text-xs md:text-sm mt-1" style={{ color: "var(--muted-foreground)" }}>
          盘后 15:35 自动扫全市场，按情绪阶段闸门 + 流动性 + 技术指标过滤后留下 ≤8 只。这是一面筛子，不是荐股。
        </p>
      </header>

      <PoolCard initial={initial} />

      <HistoryTimeline history={history} />

      <VerificationPanel />
    </div>
  );
}
