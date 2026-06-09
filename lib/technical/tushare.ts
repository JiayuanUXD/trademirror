/**
 * Tushare Pro HTTP API 封装
 * 文档：https://tushare.pro/document/2
 */

import type { OHLCV, DailyBasic, IndexData } from "./types";

const TUSHARE_URL = "http://api.tushare.pro";

function getToken(): string {
  const token = process.env.TUSHARE_API_TOKEN;
  if (!token) throw new Error("TUSHARE_API_TOKEN 未配置");
  return token;
}

// ─── 通用调用 ────────────────────────────────────────────────────────────────

type TushareResponse = {
  code: number;
  msg: string;
  data: {
    fields: string[];
    items: (string | number | null)[][];
    has_more: boolean;
  } | null;
};

async function callTushare(
  apiName: string,
  params: Record<string, string | number>,
  fields?: string,
): Promise<Record<string, string | number | null>[]> {
  const body = {
    api_name: apiName,
    token: getToken(),
    params,
    ...(fields ? { fields } : {}),
  };

  const res = await fetch(TUSHARE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    throw new Error(`Tushare HTTP ${res.status}`);
  }

  const json = (await res.json()) as TushareResponse;

  if (json.code !== 0) {
    throw new Error(`Tushare error ${json.code}: ${json.msg}`);
  }

  if (!json.data || !json.data.items.length) {
    return [];
  }

  const { fields: cols, items } = json.data;
  return items.map((row) => {
    const obj: Record<string, string | number | null> = {};
    cols.forEach((col, i) => {
      obj[col] = row[i];
    });
    return obj;
  });
}

// ─── 项目编码 ↔ Tushare 编码 ─────────────────────────────────────────────────

export function toTushareCode(stockCode: string, market: "SH" | "SZ" | "BJ"): string {
  return `${stockCode}.${market}`;
}

// ─── 日K线 ──────────────────────────────────────────────────────────────────

export async function getDailyKline(
  tsCode: string,
  startDate: string,
  endDate: string,
): Promise<OHLCV[]> {
  const rows = await callTushare(
    "daily",
    { ts_code: tsCode, start_date: startDate, end_date: endDate },
    "ts_code,trade_date,open,high,low,close,vol,amount,pct_chg",
  );

  // Tushare 返回按日期降序，翻转为升序
  return rows
    .map((r) => ({
      date: r.trade_date as string,
      open: r.open as number,
      high: r.high as number,
      low: r.low as number,
      close: r.close as number,
      volume: r.vol as number,
      amount: r.amount as number,
      pctChg: r.pct_chg as number,
    }))
    .reverse();
}

// ─── 每日基本面（换手率、PE、PB、市值）──────────────────────────────────────

export async function getDailyBasic(
  tsCode: string,
  tradeDate: string,
): Promise<DailyBasic | null> {
  // 先尝试当日，没有则扩展到近5天（应对数据延迟）
  let rows = await callTushare(
    "daily_basic",
    { ts_code: tsCode, trade_date: tradeDate },
    "ts_code,trade_date,turnover_rate,pe,pb,total_mv,circ_mv",
  );

  if (rows.length === 0) {
    const d = new Date(Number(tradeDate.slice(0, 4)), Number(tradeDate.slice(4, 6)) - 1, Number(tradeDate.slice(6, 8)));
    d.setDate(d.getDate() - 5);
    const startDate = formatDate(d);
    rows = await callTushare(
      "daily_basic",
      { ts_code: tsCode, start_date: startDate, end_date: tradeDate },
      "ts_code,trade_date,turnover_rate,pe,pb,total_mv,circ_mv",
    );
  }

  if (rows.length === 0) return null;

  // 取最近一条
  const r = rows[0];
  return {
    date: r.trade_date as string,
    turnoverRate: (r.turnover_rate as number) ?? 0,
    pe: (r.pe as number) ?? 0,
    pb: (r.pb as number) ?? 0,
    totalMv: (r.total_mv as number) ?? 0,
    circMv: (r.circ_mv as number) ?? 0,
  };
}

// ─── 大盘指数 ───────────────────────────────────────────────────────────────

const INDEX_CODES = {
  sh: "000001.SH",    // 上证指数
  sz: "399001.SZ",    // 深证成指
  cy: "399006.SZ",    // 创业板指
} as const;

export async function getIndexDaily(
  startDate: string,
  endDate: string,
): Promise<{ sh: IndexData[]; sz: IndexData[]; cy: IndexData[] }> {
  const results = await Promise.all(
    Object.entries(INDEX_CODES).map(async ([key, tsCode]) => {
      const rows = await callTushare(
        "index_daily",
        { ts_code: tsCode, start_date: startDate, end_date: endDate },
        "ts_code,trade_date,open,high,low,close,vol,amount,pct_chg",
      );

      const data: IndexData[] = rows
        .map((r) => ({
          tsCode: r.ts_code as string,
          date: r.trade_date as string,
          open: r.open as number,
          high: r.high as number,
          low: r.low as number,
          close: r.close as number,
          volume: r.vol as number,
          amount: r.amount as number,
          pctChg: r.pct_chg as number,
        }))
        .reverse();

      return [key, data] as const;
    }),
  );

  return Object.fromEntries(results) as { sh: IndexData[]; sz: IndexData[]; cy: IndexData[] };
}

/**
 * 获取三大指数当日数据
 * 优先使用 Sina Finance 实时接口（无延迟），失败时回退 Tushare index_daily
 */
export async function getIndexForDate(date: string): Promise<{
  sh: IndexData | null;
  sz: IndexData | null;
  cy: IndexData | null;
}> {
  // ── 方案1：Sina 实时行情（秒级更新，无延迟）──
  try {
    const sinaResult = await fetchSinaIndex(date);
    if (sinaResult.sh || sinaResult.sz || sinaResult.cy) {
      return sinaResult;
    }
  } catch {
    // Sina 不可用，回退 Tushare
  }

  // ── 方案2：Tushare index_daily（可能延迟数小时）──
  const d = new Date(Number(date.slice(0, 4)), Number(date.slice(4, 6)) - 1, Number(date.slice(6, 8)));
  d.setDate(d.getDate() - 5);
  const startDate = formatDate(d);

  const data = await getIndexDaily(startDate, date);
  return {
    sh: data.sh[data.sh.length - 1] ?? null,
    sz: data.sz[data.sz.length - 1] ?? null,
    cy: data.cy[data.cy.length - 1] ?? null,
  };
}

/**
 * Sina Finance 实时指数接口
 * 用 s_ 前缀获取简化行情：名称,最新价,涨跌点,涨跌幅%,成交量(手),成交额(万)
 */
async function fetchSinaIndex(date: string): Promise<{
  sh: IndexData | null;
  sz: IndexData | null;
  cy: IndexData | null;
}> {
  const url = "http://hq.sinajs.cn/list=s_sh000001,s_sz399001,s_sz399006";
  const res = await fetch(url, {
    signal: AbortSignal.timeout(5000),
    headers: { Referer: "http://finance.sina.com.cn" },
  });

  if (!res.ok) return { sh: null, sz: null, cy: null };

  const text = await res.text();
  const result: { sh: IndexData | null; sz: IndexData | null; cy: IndexData | null } = {
    sh: null, sz: null, cy: null,
  };

  // var hq_str_s_sh000001="上证指数,4010.0307,50.6929,1.28,5765700,117308893";
  const mapping: [string, keyof typeof result][] = [
    ["s_sh000001", "sh"],
    ["s_sz399001", "sz"],
    ["s_sz399006", "cy"],
  ];

  for (const [code, key] of mapping) {
    const match = text.match(new RegExp(`hq_str_${code}="([^"]*)"`));
    if (!match) continue;
    const fields = match[1].split(",");
    if (fields.length < 6) continue;

    const close = parseFloat(fields[1]);
    const pctChg = parseFloat(fields[3]);
    const volume = parseFloat(fields[4]);
    const amount = parseFloat(fields[5]);

    if (isNaN(close) || close <= 0) continue;

    result[key] = {
      tsCode: code,
      date,
      open: close,   // 简化行情不含 open/high/low，用 close 占位
      high: close,
      low: close,
      close,
      volume,
      amount,
      pctChg,
    };
  }

  return result;
}

// ─── 交易日历 ───────────────────────────────────────────────────────────────

// 内存缓存：{ "202606": Map<"20260601", true>, ... }
const calendarCache = new Map<string, Map<string, boolean>>();

async function loadMonth(yyyymm: string): Promise<Map<string, boolean>> {
  if (calendarCache.has(yyyymm)) return calendarCache.get(yyyymm)!;

  const year = yyyymm.slice(0, 4);
  const month = yyyymm.slice(4, 6);
  const startDate = `${year}${month}01`;
  const endDate = `${year}${month}31`;

  const rows = await callTushare(
    "trade_cal",
    { start_date: startDate, end_date: endDate },
    "cal_date,is_open",
  );

  const map = new Map<string, boolean>();
  for (const r of rows) {
    map.set(r.cal_date as string, r.is_open === 1);
  }

  calendarCache.set(yyyymm, map);
  return map;
}

/** 判断某天是否为交易日 */
export async function isTradingDay(date: string): Promise<boolean> {
  const yyyymm = date.slice(0, 6);
  const cal = await loadMonth(yyyymm);
  return cal.get(date) === true;
}

/** 获取最近的交易日（含今天如果今天是交易日且已收盘） */
export async function getLastTradingDay(): Promise<string> {
  const now = new Date();
  // A股收盘时间 15:00 CST (UTC+8)，加30分钟缓冲
  const hour = now.getUTCHours() + 8;  // 粗略 UTC+8
  const isAfterClose = hour >= 15;

  // 从今天开始往回找
  const d = new Date(now);
  if (!isAfterClose) {
    d.setDate(d.getDate() - 1); // 未收盘，从昨天开始
  }

  for (let i = 0; i < 10; i++) {
    const dateStr = formatDate(d);
    if (await isTradingDay(dateStr)) return dateStr;
    d.setDate(d.getDate() - 1);
  }

  throw new Error("无法找到最近的交易日");
}

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

// ─── 新闻（P1，可能受积分限制）────────────────────────────────────────────

export type NewsItem = {
  datetime: string;
  title: string;
};

export async function getNews(startDate: string, endDate: string): Promise<NewsItem[]> {
  try {
    const rows = await callTushare(
      "news",
      { src: "sina", start_date: `${startDate} 00:00:00`, end_date: `${endDate} 23:59:59` },
      "datetime,title",
    );

    return rows.map((r) => ({
      datetime: r.datetime as string,
      title: r.title as string,
    }));
  } catch {
    // 积分不足时静默降级
    return [];
  }
}
