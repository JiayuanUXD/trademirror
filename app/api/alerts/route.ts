import { NextResponse } from "next/server";
import { getDecisions } from "@/lib/db/queries/decisions";
import { getHoldings } from "@/lib/db/queries/holdings";
import { computeAlerts } from "@/lib/alerts";

export async function GET() {
  const [decisions, holdings] = await Promise.all([
    getDecisions(100),
    getHoldings(),
  ]);
  const alerts = computeAlerts(decisions, holdings);
  return NextResponse.json({
    count: alerts.length,
    highCount: alerts.filter((a) => a.severity === "HIGH").length,
    alerts,
  });
}
