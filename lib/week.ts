import dayjs from "dayjs";

/**
 * Returns the Monday 00:00:00.000 UTC of the week containing `date`.
 * Uses Date.UTC to produce a timezone-independent timestamp, ensuring
 * local dev (CST) and Vercel (UTC) always compute the same weekStart.
 */
export function getWeekStart(date: dayjs.Dayjs = dayjs()): dayjs.Dayjs {
  const d = date.day(); // 0=Sun … 6=Sat
  const offset = d === 0 ? -6 : 1 - d;
  const monday = date.add(offset, "day");
  // Use calendar year/month/date (local) but force UTC midnight,
  // so the result is the same regardless of the runtime timezone.
  return dayjs(Date.UTC(monday.year(), monday.month(), monday.date()));
}

/**
 * Returns the Sunday 23:59:59.999 UTC of the week containing `date`.
 */
export function getWeekEnd(date: dayjs.Dayjs = dayjs()): dayjs.Dayjs {
  const start = getWeekStart(date);
  const sunday = start.add(6, "day");
  return dayjs(Date.UTC(sunday.year(), sunday.month(), sunday.date(), 23, 59, 59, 999));
}

/** "第21周 (05/19–05/25)" */
export function formatWeekLabel(weekStart: number): string {
  const start = dayjs(weekStart);
  const end = start.add(6, "day");
  const week = Math.ceil(start.diff(start.startOf("year"), "day") / 7) + 1;
  return `第${week}周 (${start.format("MM/DD")}–${end.format("MM/DD")})`;
}
