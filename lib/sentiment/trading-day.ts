// A 股交易日判断：周末 + 法定节假日跳过
// 2026 年法定休市表（来源：国务院办公厅放假安排，按沪深交易所惯例剔除补班日）
// 注：补班日（周六/周日补上班）A 股不开市，故不视为交易日

const HOLIDAYS_2026 = new Set<string>([
  // 元旦
  "2026-01-01",
  "2026-01-02",
  // 春节（农历正月初一为 2026-02-17）
  "2026-02-16",
  "2026-02-17",
  "2026-02-18",
  "2026-02-19",
  "2026-02-20",
  "2026-02-23",
  "2026-02-24",
  // 清明
  "2026-04-06",
  // 劳动节
  "2026-05-01",
  "2026-05-04",
  "2026-05-05",
  // 端午
  "2026-06-19",
  "2026-06-22",
  // 国庆 + 中秋
  "2026-10-01",
  "2026-10-02",
  "2026-10-05",
  "2026-10-06",
  "2026-10-07",
  "2026-10-08",
  "2026-10-09",
]);

export function isTradingDay(dateDash: string, weekday: number): boolean {
  // weekday: 0=Sun, 1=Mon, ..., 6=Sat
  if (weekday === 0 || weekday === 6) return false;
  if (HOLIDAYS_2026.has(dateDash)) return false;
  return true;
}

export function shanghaiTradingContext(now: Date = new Date()): {
  dateDash: string;
  weekday: number;
  isTrading: boolean;
} {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  });
  const parts = fmt.formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const dateDash = `${get("year")}-${get("month")}-${get("day")}`;
  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  const weekday = weekdayMap[get("weekday")] ?? 1;
  return { dateDash, weekday, isTrading: isTradingDay(dateDash, weekday) };
}
