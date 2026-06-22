import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getHistoryWithCandidates } from "@/lib/db/queries/screener";
import { VerificationPanel } from "@/components/screener/verification-panel";
import { HistoryTimeline } from "@/components/screener/history-timeline";
import { ScreenerHeader } from "@/components/screener/screener-header";
import { runBackfill } from "@/lib/screener/backfill";
import { shanghaiTradingContext } from "@/lib/sentiment/trading-day";

export const dynamic = "force-dynamic";

export default async function ScreenerPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const ctx = shanghaiTradingContext();
  await runBackfill(ctx.dateDash).catch((e) =>
    console.error("[screener page backfill]", e)
  );

  const history = await getHistoryWithCandidates(session.user.id, 14);
  const initial = history[0] ?? null;

  return (
    <div className="px-4 md:px-8 py-6 md:py-8 space-y-6">
      <ScreenerHeader initial={initial} />

      <HistoryTimeline history={history} />

      <VerificationPanel />
    </div>
  );
}
