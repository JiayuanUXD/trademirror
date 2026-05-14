import { eq } from "drizzle-orm";
import { db } from "../index";
import { settings } from "../schema";

const DEFAULT_SETTINGS_ID = "default";

export type Settings = typeof settings.$inferSelect;

export async function getSettings(): Promise<Settings> {
  let [row] = await db.select().from(settings).where(eq(settings.id, DEFAULT_SETTINGS_ID)).limit(1);
  if (!row) {
    // initialize defaults
    row = {
      id: DEFAULT_SETTINGS_ID,
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

export async function updateSettings(patch: Partial<Settings>) {
  const current = await getSettings();
  const next = { ...current, ...patch };
  await db.update(settings).set(next).where(eq(settings.id, DEFAULT_SETTINGS_ID));
  return getSettings();
}
