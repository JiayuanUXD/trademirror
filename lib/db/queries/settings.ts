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
