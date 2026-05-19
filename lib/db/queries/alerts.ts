import { getDecisions } from "./decisions";
import { getHoldings } from "./holdings";
import { computeAlerts } from "@/lib/alerts";

export async function getAlertStats(userId: string) {
  const [decisions, holdings] = await Promise.all([
    getDecisions(userId, { limit: 100 }),
    getHoldings(userId),
  ]);
  const alerts = computeAlerts(decisions, holdings);
  return {
    count: alerts.length,
    highCount: alerts.filter((a) => a.severity === "HIGH").length,
    alerts,
  };
}
