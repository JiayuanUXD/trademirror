import { db } from "../index";
import { goals } from "../schema";
import { and, eq, desc } from "drizzle-orm";
import { randomUUID } from "crypto";
import { calcRequiredReturn, calcRealismScore, type Goal, type GoalCheckin } from "@/lib/goals-utils";

export { calcRequiredReturn, calcRealismScore };
export type { Goal, GoalCheckin };

function parseGoal(row: typeof goals.$inferSelect): Goal {
  return {
    ...row,
    status: row.status as Goal["status"],
    checkins: JSON.parse(row.checkins) as GoalCheckin[],
  };
}

export async function getGoals(userId: string): Promise<Goal[]> {
  const rows = await db
    .select()
    .from(goals)
    .where(eq(goals.userId, userId))
    .orderBy(desc(goals.createdAt));
  return rows.map(parseGoal);
}

export async function getGoalById(id: string, userId: string): Promise<Goal | null> {
  const rows = await db
    .select()
    .from(goals)
    .where(and(eq(goals.id, id), eq(goals.userId, userId)));
  return rows[0] ? parseGoal(rows[0]) : null;
}

export async function createGoal(
  payload: {
    title: string;
    startAmount: number;
    targetAmount: number;
    years: number;
    note?: string;
  },
  userId: string
): Promise<Goal> {
  const requiredReturn = calcRequiredReturn(payload.startAmount, payload.targetAmount, payload.years);
  const realismScore = calcRealismScore(requiredReturn);
  const now = Date.now();
  const row = {
    id: randomUUID(),
    userId,
    title: payload.title || `${payload.years}年目标`,
    startAmount: payload.startAmount,
    targetAmount: payload.targetAmount,
    years: payload.years,
    requiredReturn,
    realismScore,
    status: "ACTIVE" as const,
    note: payload.note ?? "",
    checkins: "[]",
    createdAt: now,
    targetDate: now + payload.years * 365 * 24 * 60 * 60 * 1000,
  };
  await db.insert(goals).values(row);
  return parseGoal(row);
}

export async function addCheckin(
  goalId: string,
  userId: string,
  amount: number,
  note: string = ""
): Promise<Goal> {
  const goal = await getGoalById(goalId, userId);
  if (!goal) throw new Error("目标不存在");

  const newCheckin: GoalCheckin = { date: Date.now(), amount, note };
  const updated = [...goal.checkins, newCheckin];

  const newStatus: Goal["status"] =
    amount >= goal.targetAmount ? "ACHIEVED" : goal.status;

  await db
    .update(goals)
    .set({ checkins: JSON.stringify(updated), status: newStatus })
    .where(and(eq(goals.id, goalId), eq(goals.userId, userId)));

  return { ...goal, checkins: updated, status: newStatus };
}

export async function updateGoalStatus(
  goalId: string,
  userId: string,
  status: Goal["status"]
): Promise<void> {
  await db.update(goals).set({ status }).where(and(eq(goals.id, goalId), eq(goals.userId, userId)));
}
