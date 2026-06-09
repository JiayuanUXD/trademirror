/**
 * 技术指标计算 —— 纯函数，输入 OHLCV[]，输出各指标结果
 * 所有公式参照通达信/同花顺标准算法
 */

import type {
  OHLCV,
  MAResult,
  MACDResult,
  KDJResult,
  BOLLResult,
  RSIResult,
  VolumeResult,
  TechnicalResult,
} from "./types";

// ─── 工具函数 ────────────────────────────────────────────────────────────────

function avg(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function std(arr: number[]): number {
  if (arr.length === 0) return 0;
  const mean = avg(arr);
  const variance = arr.reduce((s, v) => s + (v - mean) ** 2, 0) / arr.length;
  return Math.sqrt(variance);
}

/** 取数组末尾 N 个元素 */
function tail(arr: number[], n: number): number[] {
  return arr.slice(Math.max(0, arr.length - n));
}

function round(v: number, digits = 2): number {
  const f = 10 ** digits;
  return Math.round(v * f) / f;
}

// ─── 均线 MA ─────────────────────────────────────────────────────────────────

function sma(closes: number[], period: number): number {
  const slice = tail(closes, period);
  return slice.length >= period ? round(avg(slice)) : 0;
}

export function computeMA(closes: number[]): MAResult {
  const ma5 = sma(closes, 5);
  const ma10 = sma(closes, 10);
  const ma20 = sma(closes, 20);
  const ma60 = sma(closes, 60);

  let alignment: MAResult["alignment"] = "mixed";
  if (ma5 > ma10 && ma10 > ma20 && ma20 > ma60 && ma60 > 0) {
    alignment = "bullish";
  } else if (ma5 < ma10 && ma10 < ma20 && ma20 < ma60 && ma60 > 0) {
    alignment = "bearish";
  }

  return { ma5, ma10, ma20, ma60, alignment };
}

// ─── MACD (12, 26, 9) ───────────────────────────────────────────────────────

type MACDSeries = { dif: number; dea: number; histogram: number };

function computeMACDSeries(closes: number[]): MACDSeries[] {
  if (closes.length < 2) return [];

  const result: MACDSeries[] = [];
  let ema12 = closes[0];
  let ema26 = closes[0];
  let dea = 0;

  for (let i = 0; i < closes.length; i++) {
    const c = closes[i];
    if (i === 0) {
      ema12 = c;
      ema26 = c;
    } else {
      ema12 = ema12 * 11 / 13 + c * 2 / 13;
      ema26 = ema26 * 25 / 27 + c * 2 / 27;
    }
    const dif = ema12 - ema26;
    dea = dea * 8 / 10 + dif * 2 / 10;
    const histogram = (dif - dea) * 2;
    result.push({ dif: round(dif, 3), dea: round(dea, 3), histogram: round(histogram, 3) });
  }

  return result;
}

export function computeMACD(closes: number[]): MACDResult {
  const series = computeMACDSeries(closes);
  if (series.length < 2) {
    return { dif: 0, dea: 0, histogram: 0, signal: "none" };
  }

  const curr = series[series.length - 1];
  const prev = series[series.length - 2];

  let signal: MACDResult["signal"] = "none";
  if (prev.dif <= prev.dea && curr.dif > curr.dea) {
    signal = "golden_cross";
  } else if (prev.dif >= prev.dea && curr.dif < curr.dea) {
    signal = "death_cross";
  } else if (curr.dif > curr.dea) {
    signal = "bullish";
  } else if (curr.dif < curr.dea) {
    signal = "bearish";
  }

  return { ...curr, signal };
}

// ─── KDJ (9, 3, 3) ──────────────────────────────────────────────────────────

type KDJSeries = { k: number; d: number; j: number };

function computeKDJSeries(klines: OHLCV[]): KDJSeries[] {
  if (klines.length < 9) return [];

  const result: KDJSeries[] = [];
  let k = 50;
  let d = 50;

  for (let i = 0; i < klines.length; i++) {
    const window = klines.slice(Math.max(0, i - 8), i + 1);
    const low9 = Math.min(...window.map((v) => v.low));
    const high9 = Math.max(...window.map((v) => v.high));

    const rsv = high9 === low9 ? 50 : ((klines[i].close - low9) / (high9 - low9)) * 100;

    k = k * 2 / 3 + rsv * 1 / 3;
    d = d * 2 / 3 + k * 1 / 3;
    const j = 3 * k - 2 * d;

    result.push({ k: round(k), d: round(d), j: round(j) });
  }

  return result;
}

export function computeKDJ(klines: OHLCV[]): KDJResult {
  const series = computeKDJSeries(klines);
  if (series.length < 2) {
    return { k: 50, d: 50, j: 50, signal: "none" };
  }

  const curr = series[series.length - 1];
  const prev = series[series.length - 2];

  let signal: KDJResult["signal"] = "none";
  if (prev.k <= prev.d && curr.k > curr.d) {
    signal = "golden_cross";
  } else if (prev.k >= prev.d && curr.k < curr.d) {
    signal = "death_cross";
  } else if (curr.k > 80 && curr.d > 80) {
    signal = "overbought";
  } else if (curr.k < 20 && curr.d < 20) {
    signal = "oversold";
  }

  return { ...curr, signal };
}

// ─── BOLL (20, 2) ───────────────────────────────────────────────────────────

export function computeBOLL(closes: number[]): BOLLResult {
  const period = 20;
  if (closes.length < period) {
    return { upper: 0, middle: 0, lower: 0, width: 0, position: "middle" };
  }

  const recent = tail(closes, period);
  const middle = round(avg(recent));
  const sd = std(recent);
  const upper = round(middle + 2 * sd);
  const lower = round(middle - 2 * sd);
  const width = middle > 0 ? round(((upper - lower) / middle) * 100) : 0;

  const price = closes[closes.length - 1];
  let position: BOLLResult["position"] = "middle";
  if (price > upper) {
    position = "above_upper";
  } else if (price > middle + (upper - middle) * 0.7) {
    position = "near_upper";
  } else if (price < lower) {
    position = "below_lower";
  } else if (price < middle - (middle - lower) * 0.7) {
    position = "near_lower";
  }

  return { upper, middle, lower, width, position };
}

// ─── RSI (6, 12, 24) ────────────────────────────────────────────────────────

function computeRSIPeriod(closes: number[], period: number): number {
  if (closes.length < period + 1) return 50;

  let avgGain = 0;
  let avgLoss = 0;

  // 初始化：前 period 天的平均涨跌
  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) avgGain += diff;
    else avgLoss += Math.abs(diff);
  }
  avgGain /= period;
  avgLoss /= period;

  // 平滑计算
  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) {
      avgGain = (avgGain * (period - 1) + diff) / period;
      avgLoss = (avgLoss * (period - 1)) / period;
    } else {
      avgGain = (avgGain * (period - 1)) / period;
      avgLoss = (avgLoss * (period - 1) + Math.abs(diff)) / period;
    }
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return round(100 - 100 / (1 + rs));
}

export function computeRSI(closes: number[]): RSIResult {
  const rsi6 = computeRSIPeriod(closes, 6);
  const rsi12 = computeRSIPeriod(closes, 12);
  const rsi24 = computeRSIPeriod(closes, 24);

  let signal: RSIResult["signal"] = "none";
  if (rsi6 > 80) signal = "overbought";
  else if (rsi6 < 20) signal = "oversold";

  return { rsi6, rsi12, rsi24, signal };
}

// ─── 量能分析 ────────────────────────────────────────────────────────────────

export function computeVolume(volumes: number[]): VolumeResult {
  const current = volumes[volumes.length - 1] ?? 0;
  const ma5 = avg(tail(volumes, 5));
  const ma20 = avg(tail(volumes, 20));

  const ratioVsMa5 = ma5 > 0 ? round(current / ma5, 2) : 1;
  const ratioVsMa20 = ma20 > 0 ? round(current / ma20, 2) : 1;

  let trend: VolumeResult["trend"] = "normal";
  if (ratioVsMa5 >= 1.5) trend = "heavy";
  else if (ratioVsMa5 <= 0.6) trend = "light";

  return { current: round(current), ma5: round(ma5), ma20: round(ma20), ratioVsMa5, ratioVsMa20, trend };
}

// ─── 综合计算 ────────────────────────────────────────────────────────────────

/**
 * 对一组K线数据计算全部技术指标
 * @param klines 至少需要 60 条日K线（升序排列）
 * @param stockCode 股票代码
 * @param stockName 股票名称
 * @param turnoverRate 当日换手率（来自 daily_basic，可选）
 */
export function computeAll(
  klines: OHLCV[],
  stockCode: string,
  stockName: string,
  turnoverRate?: number | null,
): TechnicalResult {
  const closes = klines.map((k) => k.close);
  const volumes = klines.map((k) => k.volume);
  const latest = klines[klines.length - 1];

  return {
    stockCode,
    stockName,
    date: latest.date,
    quote: {
      open: latest.open,
      high: latest.high,
      low: latest.low,
      close: latest.close,
      volume: latest.volume,
      pctChg: latest.pctChg,
      turnoverRate: turnoverRate ?? null,
    },
    ma: computeMA(closes),
    macd: computeMACD(closes),
    kdj: computeKDJ(klines),
    boll: computeBOLL(closes),
    rsi: computeRSI(closes),
    volume: computeVolume(volumes),
  };
}
