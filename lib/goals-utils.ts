/** 纯函数和类型，可在浏览器和服务端共用，不依赖 DB */

export type GoalCheckin = {
  date: number;
  amount: number;
  note: string;
};

export type Goal = {
  id: string;
  title: string;
  startAmount: number;
  targetAmount: number;
  years: number;
  requiredReturn: number;
  realismScore: number;
  status: "ACTIVE" | "ACHIEVED" | "ABANDONED";
  note: string;
  checkins: GoalCheckin[];
  createdAt: number;
  targetDate: number;
};

/** 起始 + 目标 + 年数 → 需要的年化收益率 */
export function calcRequiredReturn(start: number, target: number, years: number): number {
  if (start <= 0 || years <= 0 || target <= 0) return 0;
  return Math.pow(target / start, 1 / years) - 1;
}

/** 年化收益率 → 现实性评分（1-5） */
export function calcRealismScore(annualReturn: number): number {
  if (annualReturn < 0.08) return 5;
  if (annualReturn < 0.15) return 4;
  if (annualReturn < 0.25) return 3;
  if (annualReturn < 0.50) return 2;
  return 1;
}

/** 某时刻的预期账户金额（复利路径） */
export function expectedAmountAt(start: number, annualReturn: number, daysElapsed: number): number {
  return start * Math.pow(1 + annualReturn, daysElapsed / 365);
}
