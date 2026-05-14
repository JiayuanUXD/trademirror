import { getDecisions } from "./decisions";
import { getHoldings } from "./holdings";
import { computeAlerts } from "@/lib/alerts";

export async function getAlertStats() {
  const [decisions, holdings] = await Promise.all([
    getDecisions(100),
    getHoldings(),
  ]);
  const alerts = computeAlerts(decisions, holdings);
  return {
    count: alerts.length,
    highCount: alerts.filter((a) => a.severity === "HIGH").length,
    alerts,
  };
}
