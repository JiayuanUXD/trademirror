/**
 * 本地股票搜索：首次加载全量 A 股列表到内存，后续纯本地过滤。
 * 支持按代码、名称、拼音首字母搜索。
 */

export type StockData = {
  /** 6 位代码 */
  c: string;
  /** 股票名称 */
  n: string;
  /** 市场 */
  m: "SH" | "SZ" | "BJ";
  /** 拼音首字母 */
  p: string;
};

let stockList: StockData[] | null = null;
let loadPromise: Promise<StockData[]> | null = null;

/** 加载股票列表（只会发起一次网络请求） */
export function loadStockList(): Promise<StockData[]> {
  if (stockList) return Promise.resolve(stockList);
  if (loadPromise) return loadPromise;

  loadPromise = fetch("/data/stock-list.json")
    .then((res) => {
      if (!res.ok) throw new Error(`Failed to load stock list: ${res.status}`);
      return res.json() as Promise<StockData[]>;
    })
    .then((data) => {
      stockList = data;
      loadPromise = null;
      return data;
    })
    .catch((err) => {
      loadPromise = null;
      console.error("[stock-search] Failed to load stock list:", err);
      return [] as StockData[];
    });

  return loadPromise;
}

/** 本地搜索：代码/名称/拼音首字母匹配，返回前 10 条 */
export function searchStocks(query: string, list: StockData[], limit = 10): StockData[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const isAlpha = /^[a-z]+$/.test(q);
  const isDigit = /^\d+$/.test(q);

  const results: StockData[] = [];
  // Two passes: exact prefix first, then contains
  // Pass 1: prefix match (higher relevance)
  for (const s of list) {
    if (results.length >= limit) break;
    if (isDigit && s.c.startsWith(q)) {
      results.push(s);
    } else if (isAlpha && s.p.startsWith(q)) {
      results.push(s);
    } else if (!isDigit && !isAlpha && s.n.toLowerCase().startsWith(q)) {
      results.push(s);
    }
  }

  if (results.length >= limit) return results;

  // Pass 2: contains match (lower relevance)
  const seen = new Set(results.map((r) => r.c));
  for (const s of list) {
    if (results.length >= limit) break;
    if (seen.has(s.c)) continue;
    if (isDigit && s.c.includes(q)) {
      results.push(s);
    } else if (isAlpha && s.p.includes(q)) {
      results.push(s);
    } else if (!isDigit && !isAlpha && s.n.toLowerCase().includes(q)) {
      results.push(s);
    }
  }

  return results;
}
