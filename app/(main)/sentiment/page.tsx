import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getLatestState, getSentimentTrend, getStageHistory } from "@/lib/db/queries/sentiment";
import { getGuardrailStats } from "@/lib/db/queries/guardrails";
import { getSettings } from "@/lib/db/queries/settings";
import { capsFromSettings, thresholdsFromSettings } from "@/lib/sentiment/stage";
import { SentimentDashboard } from "@/components/sentiment/dashboard";

export const dynamic = "force-dynamic";

export default async function SentimentPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

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
    <div className="px-4 md:px-8 py-6 md:py-8 max-w-5xl mx-auto">
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
