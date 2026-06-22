import { isTradingDay } from "./trading-day";
import { getExistingDatesFrom, upsertDailyMetrics } from "@/lib/db/queries/sentiment";
import { fetchEastmoneySentiment } from "./fetcher";

function parseUTC(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function utcDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function getTradingDaysInRange(startDate: string, endDate: string): string[] {
  const days: string[] = [];
  const d = parseUTC(startDate);
  const end = parseUTC(endDate);
  while (d <= end) {
    const dash = utcDateStr(d);
    const weekday = d.getUTCDay();
    if (isTradingDay(dash, weekday)) days.push(dash);
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return days;
}

export type SentimentBackfillResult = {
  checked: number;
  filled: number;
  errors: string[];
};

export async function backfillSentiment(
  todayDash: string,
  lookbackDays = 14
): Promise<SentimentBackfillResult> {
  const start = parseUTC(todayDash);
  start.setUTCDate(start.getUTCDate() - lookbackDays);

  const startDash = utcDateStr(start);
  const tradingDays = getTradingDaysInRange(startDash, todayDash);

  const existingDates = await getExistingDatesFrom(startDash);
  const missing = tradingDays.filter((d) => !existingDates.has(d));

  if (missing.length === 0) {
    return { checked: tradingDays.length, filled: 0, errors: [] };
  }

  const errors: string[] = [];
  for (const day of missing) {
    try {
      const [y, m, d] = day.split("-").map(Number);
      const targetDate = new Date(y, m - 1, d);
      const fetched = await fetchEastmoneySentiment(targetDate);
      await upsertDailyMetrics(fetched.metrics);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "unknown";
      errors.push(`${day}: ${msg}`);
      console.error(`[sentiment backfill] ${day}:`, msg);
    }
  }

  return {
    checked: tradingDays.length,
    filled: missing.length - errors.length,
    errors,
  };
}
