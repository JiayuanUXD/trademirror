/** 日K线数据 */
export type OHLCV = {
  date: string;       // YYYYMMDD
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;     // 成交量（手）
  amount: number;     // 成交额（千元）
  pctChg: number;     // 涨跌幅 %
};

/** 每日基本面 */
export type DailyBasic = {
  date: string;
  turnoverRate: number;  // 换手率 %
  pe: number;            // 市盈率
  pb: number;            // 市净率
  totalMv: number;       // 总市值（万元）
  circMv: number;        // 流通市值（万元）
};

/** 大盘指数行情 */
export type IndexData = {
  tsCode: string;
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  amount: number;
  pctChg: number;
};

/** 均线数据 */
export type MAResult = {
  ma5: number;
  ma10: number;
  ma20: number;
  ma60: number;
  /** 排列状态 */
  alignment: "bullish" | "bearish" | "mixed";
};

/** MACD */
export type MACDResult = {
  dif: number;
  dea: number;
  histogram: number;
  signal: "golden_cross" | "death_cross" | "bullish" | "bearish" | "none";
};

/** KDJ */
export type KDJResult = {
  k: number;
  d: number;
  j: number;
  signal: "overbought" | "oversold" | "golden_cross" | "death_cross" | "none";
};

/** 布林带 */
export type BOLLResult = {
  upper: number;
  middle: number;
  lower: number;
  width: number;        // 带宽百分比
  position: "above_upper" | "near_upper" | "middle" | "near_lower" | "below_lower";
};

/** RSI */
export type RSIResult = {
  rsi6: number;
  rsi12: number;
  rsi24: number;
  signal: "overbought" | "oversold" | "none";
};

/** 量能分析 */
export type VolumeResult = {
  current: number;
  ma5: number;
  ma20: number;
  ratioVsMa5: number;   // 当日量 / MA5 量
  ratioVsMa20: number;
  trend: "heavy" | "normal" | "light";
};

/** 完整技术分析结果 */
export type TechnicalResult = {
  stockCode: string;
  stockName: string;
  date: string;
  /** 当日行情 */
  quote: {
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    pctChg: number;
    turnoverRate: number | null;
  };
  ma: MAResult;
  macd: MACDResult;
  kdj: KDJResult;
  boll: BOLLResult;
  rsi: RSIResult;
  volume: VolumeResult;
};

/** 文字信号汇总 */
export type SignalSummary = {
  stockCode: string;
  stockName: string;
  date: string;
  /** 综合评级 */
  rating: "bullish" | "neutral" | "bearish";
  /** 各指标的中文信号描述 */
  signals: {
    category: string;   // "均线" | "MACD" | "KDJ" | "BOLL" | "RSI" | "量能"
    text: string;       // 中文描述
    bias: "bullish" | "neutral" | "bearish";
  }[];
};
