import { eq, desc, and, gte, lte } from "drizzle-orm";
import { db } from "../index";
import { monthlyPortraits, decisions, weeklyReviews } from "../schema";
import type { MonthlyPortrait, ProblemEvalItem, ProblemId } from "@/types/portrait";
import { PROBLEM_IDS } from "@/types/portrait";
import { RATIONAL_BASIS } from "@/types/decision";
import dayjs from "dayjs";

function monthBounds(year: number, month: number): { start: number; end: number } {
  const start = dayjs(`${year}-${String(month).padStart(2, "0")}-01`).startOf("month").valueOf();
  const end = dayjs(`${year}-${String(month).padStart(2, "0")}-01`).endOf("month").valueOf();
  return { start, end };
}

async function attachStats(
  row: typeof monthlyPortraits.$inferSelect
): Promise<MonthlyPortrait> {
  const { start, end } = monthBounds(row.year, row.month);

  const monthDecisions = await db
    .select()
    .from(decisions)
    .where(and(gte(decisions.createdAt, start), lte(decisions.createdAt, end)));

  const monthReviews = await db
    .select()
    .from(weeklyReviews)
    .where(and(gte(weeklyReviews.weekStart, start), lte(weeklyReviews.weekStart, end)));

  const n = monthDecisions.length;
  const dangerCount = monthDecisions.filter(
    (d) => (JSON.parse(d.dangerSignals) as string[]).length > 0
  ).length;
  const fomoAvg = n > 0
    ? Math.round((monthDecisions.reduce((s, d) => s + d.fomoScore, 0) / n) * 10) / 10
    : 0;
  const calmAvg = n > 0
    ? Math.round((monthDecisions.reduce((s, d) => s + d.calmScore, 0) / n) * 10) / 10
    : 0;
  const irrationalCount = monthDecisions.filter((d) => {
    const basis = JSON.parse(d.basis) as string[];
    return basis.some((b) => !(RATIONAL_BASIS as string[]).includes(b));
  }).length;
  const irrationalPct = n > 0 ? Math.round((irrationalCount / n) * 100) : 0;
  const emotionalCount = monthDecisions.filter(
    (d) => d.fomoScore >= 7 || d.calmScore <= 4
  ).length;

  const completedReviews = monthReviews.filter((r) => r.status === "COMPLETED");
  const avgDiscipline = completedReviews.length > 0
    ? Math.round(completedReviews.reduce((s, r) => s + r.disciplineTotal, 0) / completedReviews.length * 10) / 10
    : 0;

  const problemEvals = JSON.parse(row.problemEvals) as ProblemEvalItem[];
  // Ensure all 6 problems have an entry
  const evalMap = new Map(problemEvals.map((p) => [p.id, p.eval]));
  const fullEvals: ProblemEvalItem[] = PROBLEM_IDS.map((id) => ({
    id,
    eval: evalMap.get(id) ?? "STABLE",
  }));

  return {
    id: row.id,
    year: row.year,
    month: row.month,
    status: row.status,
    reflection: row.reflection,
    nextFocus: row.nextFocus as ProblemId | "",
    problemEvals: fullEvals,
    createdAt: row.createdAt,
    completedAt: row.completedAt,
    decisionCount: n,
    dangerCount,
    fomoAvg,
    calmAvg,
    irrationalPct,
    avgDiscipline,
    emotionalCount,
  };
}

export async function getPortraits(): Promise<MonthlyPortrait[]> {
  const rows = await db
    .select()
    .from(monthlyPortraits)
    .orderBy(desc(monthlyPortraits.year), desc(monthlyPortraits.month));
  return Promise.all(rows.map(attachStats));
}

export async function getPortraitById(id: string): Promise<MonthlyPortrait | null> {
  const rows = await db.select().from(monthlyPortraits).where(eq(monthlyPortraits.id, id)).limit(1);
  return rows[0] ? attachStats(rows[0]) : null;
}

export async function getPortraitByYearMonth(
  year: number,
  month: number
): Promise<MonthlyPortrait | null> {
  const rows = await db
    .select()
    .from(monthlyPortraits)
    .where(and(eq(monthlyPortraits.year, year), eq(monthlyPortraits.month, month)))
    .limit(1);
  return rows[0] ? attachStats(rows[0]) : null;
}

export async function createPortrait(year: number, month: number): Promise<MonthlyPortrait> {
  const row = {
    id: crypto.randomUUID(),
    year,
    month,
    status: "DRAFT" as const,
    reflection: "",
    nextFocus: "",
    problemEvals: "[]",
    createdAt: Date.now(),
    completedAt: null,
  };
  await db.insert(monthlyPortraits).values(row);
  const created = await getPortraitById(row.id);
  if (!created) throw new Error("Failed to create portrait");
  return created;
}

export async function updatePortrait(
  id: string,
  patch: {
    reflection?: string;
    nextFocus?: string;
    problemEvals?: ProblemEvalItem[];
    complete?: boolean;
  }
): Promise<MonthlyPortrait> {
  const set: Record<string, unknown> = {};
  if (patch.reflection !== undefined) set.reflection = patch.reflection;
  if (patch.nextFocus !== undefined) set.nextFocus = patch.nextFocus;
  if (patch.problemEvals !== undefined) set.problemEvals = JSON.stringify(patch.problemEvals);
  if (patch.complete) { set.status = "COMPLETED"; set.completedAt = Date.now(); }

  await db.update(monthlyPortraits).set(set).where(eq(monthlyPortraits.id, id));
  const updated = await getPortraitById(id);
  if (!updated) throw new Error("Portrait not found");
  return updated;
}
