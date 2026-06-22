import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getLatestState, getSentimentTrend, getStageHistory } from "@/lib/db/queries/sentiment";
import { getGuardrailStats } from "@/lib/db/queries/guardrails";
import { getSettings } from "@/lib/db/queries/settings";
import { capsFromSettings, thresholdsFromSettings } from "@/lib/sentiment/stage";
import { SentimentDashboard } from "@/components/sentiment/dashboard";
import { shanghaiTradingContext } from "@/lib/sentiment/trading-day";
import { backfillSentiment } from "@/lib/sentiment/backfill-sentiment";

export const dynamic = "force-dynamic";

export default async function SentimentPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  // 自动补齐最近 14 个交易日缺失数据（fire-and-forget，不阻塞页面渲染）
  const ctx = shanghaiTradingContext();
  if (ctx.isTrading) {
    backfillSentiment(ctx.dateDash, 14).catch((e) =>
      console.error("[sentiment page backfill]", e)
    );
  }

  const userId = session.user.id;
  const userSettings = await getSettings(userId);
  const caps = capsFromSettings(userSettings);
  const thresholds = thresholdsFromSettings(userSettings);

  const [latest, trend, stageHistory, guardrailStats] = await Promise.all([
    getLatestState(caps, thresholds),
    getSentimentTrend(14),
    getStageHistory(30, caps),
    getGuardrailStats(userId, 30),
  ]);

  return (
    <div className="px-4 md:px-8 py-6 md:py-8">
      <header className="mb-6">
        <h1 className="text-xl md:text-2xl font-semibold" style={{ color: "var(--foreground)" }}>
          市场情绪
        </h1>
        <p className="text-xs md:text-sm mt-1" style={{ color: "var(--muted-foreground)" }}>
          盘后 5 分钟回填核心指标，自动给出阶段结论与仓位上限。
        </p>
      </header>

      <SentimentDashboard
        initialLatest={latest}
        initialTrend={trend}
        initialStageHistory={stageHistory}
        initialGuardrailStats={guardrailStats}
      />
    </div>
  );
}
