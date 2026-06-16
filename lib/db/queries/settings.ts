import { and, eq } from "drizzle-orm";
import { db } from "../index";
import { settings } from "../schema";

export type Settings = typeof settings.$inferSelect;

export async function getSettings(userId: string): Promise<Settings> {
  let [row] = await db
    .select()
    .from(settings)
    .where(eq(settings.userId, userId))
    .limit(1);

  if (!row) {
    row = {
      id: crypto.randomUUID(),
      userId,
      displayName: "",
      maxPositionPct: 25,
      weeklyTradeLimit: 2,
      defaultStopLossPct: 10,
      totalCapital: 0,
      dailyOpenLimit: 2,
      capIce: 0.20,
      capRepair: 0.50,
      capFerment: 0.80,
      capMainRise: 1.00,
      capEbb: 0.30,
      thrMainRiseLimitUp: 80,
      thrMainRiseSealRate: 0.70,
      thrMainRiseMaxBoards: 5,
      thrEbbLimitDown: 30,
      thrIceLimitUp: 30,
      thrIceMaxBoards: 2,
      thrFermentLimitUp: 50,
      thrFermentMaxBoards: 4,
      minTurnoverYi: 1.0,
      minTurnoverRatePct: 3.0,
      maxTurnoverRatePct: 25.0,
      minPrice: 3,
      maxPrice: 200,
      excludeSt: true,
      excludeNew: true,
      maxPoolSize: 8,
    };
    await db.insert(settings).values(row);
  }
  return row;
}

export async function updateSettings(patch: Partial<Settings>, userId: string) {
  const current = await getSettings(userId);
  const next = { ...current, ...patch };
  await db.update(settings).set(next).where(and(eq(settings.userId, userId), eq(settings.id, current.id)));
  return getSettings(userId);
}
