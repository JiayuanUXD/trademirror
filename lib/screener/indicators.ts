// 技术指标纯函数（无 IO）
// 第 2 层用：trend 是否走坏（close 跌破 MA10、MA5 死叉 MA10）
// 第 3 层用：量比 ≥2、突破近 N 日新高、缩量回踩 5 日线

import type { KLineBar } from "./kline";

// 简单移动均线：取 close，输出与 bars 等长，前 period-1 项为 null
export function sma(bars: KLineBar[], period: number): (number | null)[] {
  const out: (number | null)[] = new Array(bars.length).fill(null);
  let sum = 0;
  for (let i = 0; i < bars.length; i++) {
    sum += bars[i].close;
    if (i >= period) sum -= bars[i - period].close;
    if (i >= period - 1) out[i] = sum / period;
  }
  return out;
}

// 量的简单均线
export function smaVolume(bars: KLineBar[], period: number): (number | null)[] {
  const out: (number | null)[] = new Array(bars.length).fill(null);
  let sum = 0;
  for (let i = 0; i < bars.length; i++) {
    sum += bars[i].volume;
    if (i >= period) sum -= bars[i - period].volume;
    if (i >= period - 1) out[i] = sum / period;
  }
  return out;
}

// 量比：今日成交量 / 过去 5 日均量（含今日前 5 个交易日）
// 标准定义按分钟外推；这里取盘后简化版（成交量比近 5 日均量）
export function volumeRatio(bars: KLineBar[]): number | null {
  if (bars.length < 6) return null;
  const today = bars[bars.length - 1].volume;
  let sum = 0;
  for (let i = bars.length - 6; i < bars.length - 1; i++) sum += bars[i].volume;
  const avg5 = sum / 5;
  if (avg5 <= 0) return null;
  return today / avg5;
}

// 是否创近 N 日新高（含今日；今日 close 是否 > 过去 N-1 日的 max(close)）
export function isBreakoutHigh(bars: KLineBar[], lookback: number): boolean {
  if (bars.length < lookback + 1) return false;
  const today = bars[bars.length - 1].close;
  let max = -Infinity;
  for (let i = bars.length - 1 - lookback; i < bars.length - 1; i++) {
    if (bars[i].close > max) max = bars[i].close;
  }
  return today > max;
}

// 平台突破：过去 lookback 个交易日内（不含今日）最高 close 与最低 close
// 振幅 ≤ thresholdPct 且今日突破最高 close
export function isPlatformBreakout(
  bars: KLineBar[],
  lookback: number = 10,
  thresholdPct: number = 8
): boolean {
  if (bars.length < lookback + 1) return false;
  const today = bars[bars.length - 1].close;
  let high = -Infinity;
  let low = Infinity;
  for (let i = bars.length - 1 - lookback; i < bars.length - 1; i++) {
    const c = bars[i].close;
    if (c > high) high = c;
    if (c < low) low = c;
  }
  if (low <= 0) return false;
  const amplitudePct = ((high - low) / low) * 100;
  return amplitudePct <= thresholdPct && today > high;
}

// 趋势走坏：close 跌破 MA10
export function isBelowMA(bars: KLineBar[], period: number): boolean {
  const ma = sma(bars, period);
  const last = ma[ma.length - 1];
  if (last == null) return false; // 数据不足时不判定
  return bars[bars.length - 1].close < last;
}

// MA5 死叉 MA10（昨日 ma5 ≥ ma10，今日 ma5 < ma10）
export function isMaDeadCross(bars: KLineBar[]): boolean {
  if (bars.length < 11) return false;
  const ma5 = sma(bars, 5);
  const ma10 = sma(bars, 10);
  const a5 = ma5[ma5.length - 1];
  const a10 = ma10[ma10.length - 1];
  const b5 = ma5[ma5.length - 2];
  const b10 = ma10[ma10.length - 2];
  if (a5 == null || a10 == null || b5 == null || b10 == null) return false;
  return b5 >= b10 && a5 < a10;
}

export type TechSignal = {
  ma5: number | null;
  ma10: number | null;
  volRatio: number | null;
  breakout20: boolean;     // 创 20 日新高
  platformBreakout: boolean; // 平台 + 突破
  belowMA10: boolean;
  deadCross: boolean;
};

export function computeSignals(bars: KLineBar[]): TechSignal {
  const ma5Arr = sma(bars, 5);
  const ma10Arr = sma(bars, 10);
  return {
    ma5: ma5Arr[ma5Arr.length - 1],
    ma10: ma10Arr[ma10Arr.length - 1],
    volRatio: volumeRatio(bars),
    breakout20: isBreakoutHigh(bars, 20),
    platformBreakout: isPlatformBreakout(bars, 10, 8),
    belowMA10: isBelowMA(bars, 10),
    deadCross: isMaDeadCross(bars),
  };
}
