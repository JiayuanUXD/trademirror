import { eq, desc, and, gte, lte } from "drizzle-orm";
import { db } from "../index";
import { weeklyReviews, decisions } from "../schema";
import type { WeeklyReview, DisciplineItem, DisciplineScore } from "@/types/review";
import { DISCIPLINE_DEFINITIONS } from "@/types/review";

function buildDefaultItems(tradeCount: number): DisciplineItem[] {
  return DISCIPLINE_DEFINITIONS.map((def) => {
    let autoSuggested: DisciplineScore | undefined;
    if (def.id === "limited_trades") {
      autoSuggested = tradeCount <= 2 ? 2 : tradeCount <= 4 ? 1 : 0;
    }
    return { id: def.id, label: def.label, score: autoSuggested ?? 2, autoSuggested };
  });
}

async function attachStats(
  row: typeof weeklyReviews.$inferSelect,
  userId: string
): Promise<WeeklyReview> {
  const items = JSON.parse(row.disciplineItems) as DisciplineItem[];

  const weekDecisions = await db
    .select()
    .from(decisions)
    .where(and(
      gte(decisions.createdAt, row.weekStart),
      lte(decisions.createdAt, row.weekEnd),
      eq(decisions.userId, userId),
    ));

  const weekDecisionCount = weekDecisions.length;
  const dangerTradeCount = weekDecisions.filter(
    (d) => (JSON.parse(d.dangerSignals) as string[]).length > 0
  ).length;
  const highFomoCount = weekDecisions.filter((d) => d.fomoScore >= 7).length;

  return {
    ...row,
    disciplineItems: items,
    weekDecisionCount,
    dangerTradeCount,
    highFomoCount,
  };
}

export async function getReviews(userId: string): Promise<WeeklyReview[]> {
  const rows = await db
    .select()
    .from(weeklyReviews)
    .where(eq(weeklyReviews.userId, userId))
    .orderBy(desc(weeklyReviews.weekStart));
  return Promise.all(rows.map((r) => attachStats(r, userId)));
}

export async function getReviewById(id: string, userId: string): Promise<WeeklyReview | null> {
  const rows = await db
    .select()
    .from(weeklyReviews)
    .where(and(eq(weeklyReviews.id, id), eq(weeklyReviews.userId, userId)))
    .limit(1);
  return rows[0] ? attachStats(rows[0], userId) : null;
}

export async function getReviewByWeekStart(
  weekStart: number,
  userId: string
): Promise<WeeklyReview | null> {
  const rows = await db
    .select()
    .from(weeklyReviews)
    .where(and(eq(weeklyReviews.weekStart, weekStart), eq(weeklyReviews.userId, userId)))
    .limit(1);
  return rows[0] ? attachStats(rows[0], userId) : null;
}

export async function createReview(
  weekStart: number,
  weekEnd: number,
  userId: string
): Promise<WeeklyReview> {
  const weekDecisions = await db
    .select()
    .from(decisions)
    .where(and(
      gte(decisions.createdAt, weekStart),
      lte(decisions.createdAt, weekEnd),
      eq(decisions.userId, userId),
    ));

  const defaultItems = buildDefaultItems(weekDecisions.length);
  const now = Date.now();

  const row = {
    id: crypto.randomUUID(),
    weekStart,
    weekEnd,
    userId,
    status: "DRAFT" as const,
    bestThing: "",
    worstThing: "",
    doOver: "",
    disciplineItems: JSON.stringify(defaultItems),
    disciplineTotal: defaultItems.reduce((s, i) => s + i.score, 0),
    createdAt: now,
    completedAt: null,
  };

  await db.insert(weeklyReviews).values(row);
  const created = await getReviewById(row.id, userId);
  if (!created) throw new Error("Failed to create review");
  return created;
}

export async function updateReview(
  id: string,
  userId: string,
  patch: {
    bestThing?: string;
    worstThing?: string;
    doOver?: string;
    disciplineItems?: DisciplineItem[];
    complete?: boolean;
  }
): Promise<WeeklyReview> {
  const set: Record<string, unknown> = {};

  if (patch.bestThing !== undefined) set.bestThing = patch.bestThing;
  if (patch.worstThing !== undefined) set.worstThing = patch.worstThing;
  if (patch.doOver !== undefined) set.doOver = patch.doOver;
  if (patch.disciplineItems !== undefined) {
    set.disciplineItems = JSON.stringify(patch.disciplineItems);
    set.disciplineTotal = patch.disciplineItems.reduce((s, i) => s + i.score, 0);
  }
  if (patch.complete) {
    set.status = "COMPLETED";
    set.completedAt = Date.now();
  }

  await db.update(weeklyReviews).set(set).where(and(eq(weeklyReviews.id, id), eq(weeklyReviews.userId, userId)));
  const updated = await getReviewById(id, userId);
  if (!updated) throw new Error("Review not found");
  return updated;
}
