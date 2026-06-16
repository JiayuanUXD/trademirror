// 日 K 线拉取（新浪 CN_MarketDataService）
//
// 路径：https://quotes.sina.cn/cn/api/json_v2.php/CN_MarketDataService.getKLineData
// 必带 Referer: https://finance.sina.com.cn/
// 参数：symbol=sh600519, scale=240（日 K，分钟数）, datalen=N
// 返回：JSON 数组 [{day, open, high, low, close, volume, ma_price5?, ma_volume5?}]
// volume 单位：股
//
// 选第 0 层 60 只候选 → 并发拉日 K → 算 MA5/MA10/量比/N 日新高
// 5400 只全市场拉不动；这里只对漏斗第 1 层后留下的少量股票拉 K。

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36";
const REFERER = "https://finance.sina.com.cn/";
const BASE =
  "https://quotes.sina.cn/cn/api/json_v2.php/CN_MarketDataService.getKLineData";

export type KLineBar = {
  day: string;     // YYYY-MM-DD
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number; // 股数
};

type SinaBar = {
  day: string;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
};

function num(v: string): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function toSinaSymbol(code: string, market: "SH" | "SZ" | "BJ"): string {
  if (market === "SH") return `sh${code}`;
  if (market === "SZ") return `sz${code}`;
  // 北交所新浪用 bj 前缀，但 K 线接口对 bj 支持差，回退到 sh
  return `bj${code}`;
}

export async function fetchKLine(
  code: string,
  market: "SH" | "SZ" | "BJ",
  bars: number = 30
): Promise<KLineBar[] | null> {
  const symbol = toSinaSymbol(code, market);
  const url = `${BASE}?symbol=${symbol}&scale=240&datalen=${bars}`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Referer: REFERER },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = (await res.json()) as SinaBar[] | null;
    if (!Array.isArray(json) || json.length === 0) return null;
    return json.map((b) => ({
      day: b.day,
      open: num(b.open),
      high: num(b.high),
      low: num(b.low),
      close: num(b.close),
      volume: num(b.volume),
    }));
  } catch {
    return null;
  }
}

// 并发拉取多只股票日 K，分批避免对方风控
export async function fetchKLineBatch(
  inputs: { code: string; market: "SH" | "SZ" | "BJ" }[],
  bars: number = 30,
  concurrency: number = 8
): Promise<Map<string, KLineBar[]>> {
  const map = new Map<string, KLineBar[]>();

  for (let i = 0; i < inputs.length; i += concurrency) {
    const batch = inputs.slice(i, i + concurrency);
    const results = await Promise.all(
      batch.map(async (it) => ({
        code: it.code,
        bars: await fetchKLine(it.code, it.market, bars),
      }))
    );
    for (const r of results) {
      if (r.bars && r.bars.length > 0) map.set(r.code, r.bars);
    }
  }

  return map;
}
