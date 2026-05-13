import dayjs from "dayjs";

/** Returns the Monday 00:00:00.000 of the week containing `date`. */
export function getWeekStart(date: dayjs.Dayjs = dayjs()): dayjs.Dayjs {
  const d = date.day(); // 0=Sun … 6=Sat
  const offset = d === 0 ? -6 : 1 - d;
  return date.add(offset, "day").startOf("day");
}

/** Returns the Sunday 23:59:59.999 of the week containing `date`. */
export function getWeekEnd(date: dayjs.Dayjs = dayjs()): dayjs.Dayjs {
  return getWeekStart(date).add(6, "day").endOf("day");
}

/** "第21周 (05/19–05/25)" */
export function formatWeekLabel(weekStart: number): string {
  const start = dayjs(weekStart);
  const end = start.add(6, "day");
  const week = Math.ceil(start.diff(start.startOf("year"), "day") / 7) + 1;
  return `第${week}周 (${start.format("MM/DD")}–${end.format("MM/DD")})`;
}
