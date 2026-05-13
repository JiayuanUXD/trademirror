import type { Holding } from "@/types/holding";

export function calcHealthScore(
  holding: Pick<Holding, "logic" | "prerequisites" | "exitConditions">
): number {
  let score = 0;

  // Logic completeness: up to 50 pts
  const { reasons } = holding.logic;
  score += Math.min(reasons.length * 8, 40);
  if (reasons.some((r) => r.hasData)) score += 5;
  if (reasons.some((r) => r.isVerifiable)) score += 5;

  // Exit conditions: up to 30 pts
  score += Math.min(holding.exitConditions.length * 10, 30);

  // Prerequisites: up to 20 pts
  score += Math.min(holding.prerequisites.length * 5, 20);

  return Math.min(score, 100);
}
