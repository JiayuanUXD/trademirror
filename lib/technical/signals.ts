/**
 * 将技术指标数值转化为中文信号描述
 */

import type { TechnicalResult, SignalSummary } from "./types";

type Signal = {
  category: string;
  text: string;
  bias: "bullish" | "neutral" | "bearish";
};

function maSignals(t: TechnicalResult): Signal {
  const { ma } = t;
  const price = t.quote.close;

  const parts: string[] = [];

  if (ma.alignment === "bullish") {
    parts.push("均线多头排列（MA5>MA10>MA20>MA60）");
  } else if (ma.alignment === "bearish") {
    parts.push("均线空头排列（MA5<MA10<MA20<MA60）");
  } else {
    parts.push("均线交织");
  }

  if (ma.ma5 > 0 && ma.ma20 > 0) {
    if (price > ma.ma20) {
      parts.push(`收盘价在MA20(${ma.ma20})上方`);
    } else {
      parts.push(`收盘价在MA20(${ma.ma20})下方`);
    }
  }

  return {
    category: "均线",
    text: parts.join("，"),
    bias: ma.alignment === "bullish" ? "bullish" : ma.alignment === "bearish" ? "bearish" : "neutral",
  };
}

function macdSignals(t: TechnicalResult): Signal {
  const { macd } = t;
  const parts: string[] = [];

  parts.push(`DIF=${macd.dif} DEA=${macd.dea}`);

  switch (macd.signal) {
    case "golden_cross":
      parts.push("今日金叉");
      break;
    case "death_cross":
      parts.push("今日死叉");
      break;
    case "bullish":
      parts.push("DIF在DEA上方运行");
      break;
    case "bearish":
      parts.push("DIF在DEA下方运行");
      break;
  }

  if (macd.histogram > 0) {
    parts.push(`红柱${macd.histogram.toFixed(3)}`);
  } else if (macd.histogram < 0) {
    parts.push(`绿柱${macd.histogram.toFixed(3)}`);
  }

  const bias = macd.signal === "golden_cross" || macd.signal === "bullish"
    ? "bullish" as const
    : macd.signal === "death_cross" || macd.signal === "bearish"
      ? "bearish" as const
      : "neutral" as const;

  return { category: "MACD", text: parts.join("，"), bias };
}

function kdjSignals(t: TechnicalResult): Signal {
  const { kdj } = t;
  const parts: string[] = [];

  parts.push(`K=${kdj.k} D=${kdj.d} J=${kdj.j}`);

  switch (kdj.signal) {
    case "golden_cross":
      parts.push("今日金叉");
      break;
    case "death_cross":
      parts.push("今日死叉");
      break;
    case "overbought":
      parts.push("超买区域（K/D>80）");
      break;
    case "oversold":
      parts.push("超卖区域（K/D<20）");
      break;
  }

  const bias = kdj.signal === "golden_cross" || kdj.signal === "oversold"
    ? "bullish" as const
    : kdj.signal === "death_cross" || kdj.signal === "overbought"
      ? "bearish" as const
      : "neutral" as const;

  return { category: "KDJ", text: parts.join("，"), bias };
}

function bollSignals(t: TechnicalResult): Signal {
  const { boll } = t;
  const parts: string[] = [];

  parts.push(`上轨${boll.upper} 中轨${boll.middle} 下轨${boll.lower}`);

  const positionText: Record<string, string> = {
    above_upper: "突破上轨",
    near_upper: "接近上轨",
    middle: "中轨附近",
    near_lower: "接近下轨",
    below_lower: "跌破下轨",
  };
  parts.push(positionText[boll.position] ?? "中轨附近");

  if (boll.width > 15) {
    parts.push("布林带开口较大");
  } else if (boll.width < 5) {
    parts.push("布林带缩口（可能酝酿变盘）");
  }

  const bias = boll.position === "above_upper" || boll.position === "near_upper"
    ? "bullish" as const
    : boll.position === "below_lower" || boll.position === "near_lower"
      ? "bearish" as const
      : "neutral" as const;

  return { category: "BOLL", text: parts.join("，"), bias };
}

function rsiSignals(t: TechnicalResult): Signal {
  const { rsi } = t;
  const parts: string[] = [];

  parts.push(`RSI6=${rsi.rsi6} RSI12=${rsi.rsi12} RSI24=${rsi.rsi24}`);

  if (rsi.signal === "overbought") {
    parts.push("短线超买（RSI6>80）");
  } else if (rsi.signal === "oversold") {
    parts.push("短线超卖（RSI6<20）");
  } else if (rsi.rsi6 > 60) {
    parts.push("偏强");
  } else if (rsi.rsi6 < 40) {
    parts.push("偏弱");
  } else {
    parts.push("中性区域");
  }

  const bias = rsi.signal === "overbought"
    ? "bearish" as const
    : rsi.signal === "oversold"
      ? "bullish" as const
      : "neutral" as const;

  return { category: "RSI", text: parts.join("，"), bias };
}

function volumeSignals(t: TechnicalResult): Signal {
  const { volume } = t;
  const parts: string[] = [];

  const trendText = { heavy: "放量", normal: "量能平稳", light: "缩量" };
  parts.push(trendText[volume.trend]);
  parts.push(`量比MA5=${volume.ratioVsMa5}x`);
  parts.push(`量比MA20=${volume.ratioVsMa20}x`);

  if (t.quote.turnoverRate !== null) {
    parts.push(`换手率${t.quote.turnoverRate.toFixed(2)}%`);
  }

  // 量价配合判断
  const priceUp = t.quote.pctChg > 0;
  const bias = volume.trend === "heavy" && priceUp
    ? "bullish" as const
    : volume.trend === "heavy" && !priceUp
      ? "bearish" as const
      : "neutral" as const;

  return { category: "量能", text: parts.join("，"), bias };
}

// ─── 综合评级 ────────────────────────────────────────────────────────────────

export function summarize(t: TechnicalResult): SignalSummary {
  const signals = [
    maSignals(t),
    macdSignals(t),
    kdjSignals(t),
    bollSignals(t),
    rsiSignals(t),
    volumeSignals(t),
  ];

  // 投票：多空信号计数
  let bullish = 0;
  let bearish = 0;
  for (const s of signals) {
    if (s.bias === "bullish") bullish++;
    else if (s.bias === "bearish") bearish++;
  }

  let rating: SignalSummary["rating"] = "neutral";
  if (bullish >= 4) rating = "bullish";
  else if (bearish >= 4) rating = "bearish";
  else if (bullish > bearish + 1) rating = "bullish";
  else if (bearish > bullish + 1) rating = "bearish";

  return {
    stockCode: t.stockCode,
    stockName: t.stockName,
    date: t.date,
    rating,
    signals,
  };
}
