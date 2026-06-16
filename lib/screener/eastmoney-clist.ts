// 新浪全市场快照拉取（沪深京 A 股节点 hs_a）
//
// 路径：https://vip.stock.finance.sina.com.cn/quotes_service/api/json_v2.php/Market_Center.getHQNodeData
// 必带 Referer: https://finance.sina.com.cn/，否则 401。
// 单页上限 100；hs_a 全 A 约 5500 只，需 ~56 页并发拉取。
//
// 关键字段：
//   symbol         "sh600519" 类（带前缀）
//   code           "600519"
//   name           中文名
//   trade          现价（字符串）
//   pricechange    涨跌额
//   changepercent  涨跌幅 %
//   amount         成交额（元，数字）
//   volume         成交量（股，数字）
//   turnoverratio  换手率 %
//   high/low/settlement → 计算振幅
//
// 量比新浪没给（要走另一接口），先留 null。

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36";
const REFERER = "https://finance.sina.com.cn/";
const BASE =
  "https://vip.stock.finance.sina.com.cn/quotes_service/api/json_v2.php/Market_Center.getHQNodeData";
const PAGE_SIZE = 100;
const NODE = "hs_a";
const CONCURRENCY = 8;

export type MarketRow = {
  symbol: string;
  name: string;
  market: "SH" | "SZ" | "BJ";
  price: number;
  changePct: number;
  turnoverYi: number;
  turnoverRatePct: number;
  volumeRatio: number | null;
  amplitudePct: number | null;
};

type SinaItem = {
  symbol: string;
  code: string;
  name: string;
  trade: string;
  changepercent: number;
  high: string;
  low: string;
  settlement: string;
  amount: number;
  volume: number;
  turnoverratio: number;
};

function num(v: unknown): number | null {
  if (v === "-" || v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function marketOf(sinaSymbol: string): "SH" | "SZ" | "BJ" {
  if (sinaSymbol.startsWith("sh")) return "SH";
  if (sinaSymbol.startsWith("sz")) return "SZ";
  return "BJ";
}

async function fetchCount(): Promise<number> {
  const url =
    `https://vip.stock.finance.sina.com.cn/quotes_service/api/json_v2.php/` +
    `Market_Center.getHQNodeStockCount?node=${NODE}`;
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Referer: REFERER },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`sina count ${res.status}`);
  const txt = (await res.text()).trim();
  // 返回如 "5527"（带引号）
  const cleaned = txt.replace(/^["']|["']$/g, "");
  const n = Number(cleaned);
  if (!Number.isFinite(n)) throw new Error(`sina count parse: ${txt.slice(0, 50)}`);
  return n;
}

async function fetchPage(page: number): Promise<SinaItem[]> {
  const url =
    `${BASE}?page=${page}&num=${PAGE_SIZE}&sort=symbol&asc=1&node=${NODE}`;
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Referer: REFERER },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`sina page ${page}: ${res.status}`);
  const json = (await res.json()) as SinaItem[] | null;
  return json ?? [];
}

function toMarketRow(it: SinaItem): MarketRow | null {
  const price = num(it.trade);
  const amount = num(it.amount);
  const turnoverRate = num(it.turnoverratio);
  if (price == null || amount == null || turnoverRate == null) return null;

  const high = num(it.high);
  const low = num(it.low);
  const settle = num(it.settlement);
  const amplitudePct =
    high != null && low != null && settle && settle > 0
      ? ((high - low) / settle) * 100
      : null;

  return {
    symbol: it.code,
    name: it.name,
    market: marketOf(it.symbol),
    price,
    changePct: num(it.changepercent) ?? 0,
    turnoverYi: amount / 1e8,
    turnoverRatePct: turnoverRate,
    volumeRatio: null,
    amplitudePct,
  };
}

export async function fetchEastmoneyClist(): Promise<MarketRow[]> {
  const total = await fetchCount();
  const pageCount = Math.ceil(total / PAGE_SIZE);

  // 并发分批：每批 CONCURRENCY 页
  const all: SinaItem[] = [];
  for (let i = 0; i < pageCount; i += CONCURRENCY) {
    const batch: Promise<SinaItem[]>[] = [];
    for (let j = i; j < Math.min(i + CONCURRENCY, pageCount); j++) {
      batch.push(fetchPage(j + 1));
    }
    const results = await Promise.all(batch);
    for (const items of results) all.push(...items);
  }

  const rows: MarketRow[] = [];
  for (const it of all) {
    const r = toMarketRow(it);
    if (r) rows.push(r);
  }
  return rows;
}
