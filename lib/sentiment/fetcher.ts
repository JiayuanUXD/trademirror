// 东财涨停池 / 跌停池 / 炸板池 公开接口拉取
// 新浪指数 hq 接口拉两市成交额；新浪 list 接口拉昨涨停今日开盘价。
// 接口字段说明（截至 2026-06）:
//   涨停: getTopicZTPool → data.tc=涨停家数, data.pool[].lbc=连板数, data.pool[].c=代码
//   跌停: getTopicDTPool → data.tc=跌停家数
//   炸板: getTopicZBPool → data.tc=炸板家数（涨停后撬板）
// 封板率 = 涨停家数 / (涨停家数 + 炸板家数)
//
// 两市成交额：
//   sh000001 / sz399001 第 10 字段为该指数的总成交额（元）
//
// 昨涨停今日溢价：
//   PRD §4：取昨日所有涨停股，计算今日开盘价相对昨收的涨幅均值
//   涨停代码取自昨日 ZTPool 的 pool[].c；今开/昨收走新浪 list（每批 200 只）

import type { DailyMetricsInput } from "@/lib/db/queries/sentiment";

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36";
const REFERER = "https://quote.eastmoney.com/";
const SINA_REFERER = "https://finance.sina.com.cn/";

type ZTPoolItem = {
  c: string;       // 股票代码（六位）
  m?: number;      // 市场（1=沪，0=深）
  n: string;       // 名称
  lbc: number;     // 连板数
  zbc: number;     // 当日炸板次数（不是炸板池，是这只在当日炸板的次数）
};
type PoolResp<T> = {
  rc: number;
  data: { tc: number; qdate: number; pool: T[] | null } | null;
};

async function fetchPool<T>(url: string): Promise<PoolResp<T>> {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Referer: REFERER },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`east fetch ${res.status}: ${url}`);
  return (await res.json()) as PoolResp<T>;
}

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

function ymdDash(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export type FetchedSentiment = {
  metrics: DailyMetricsInput;
  source: "eastmoney";
};

// 东财使用东八区的"自然日"作为查询参数，所以这里用 Asia/Shanghai 的当地日期
function shanghaiNow(): Date {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "0";
  return new Date(
    Number(get("year")),
    Number(get("month")) - 1,
    Number(get("day")),
    Number(get("hour")),
    Number(get("minute")),
    Number(get("second"))
  );
}

// ─── 辅助接口：两市成交额 + 昨涨停今日溢价 ─────────────────────────────────

// 新浪 hq 返回 GBK 编码；只用数字字段时用 latin1 解码再 split 也是 OK 的
async function fetchSinaHq(symbols: string[]): Promise<string> {
  const url = `https://hq.sinajs.cn/list=${symbols.join(",")}`;
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Referer: SINA_REFERER },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`sina hq ${res.status}`);
  // 只用数字字段（开盘价、昨收、成交额）→ 用 latin1 还原即可
  const buf = await res.arrayBuffer();
  return Buffer.from(buf).toString("latin1");
}

// 解析 hq 一行：var hq_str_sh000001="名称,今开,昨收,现价,最高,最低,...,成交量,成交额,..."
// 索引（去掉名称）：0=今开 1=昨收 2=现价 3=最高 4=最低 5=买1价 6=卖1价 7=成交量 8=成交额（元）
function parseHqLine(line: string): { fields: string[] } | null {
  const m = line.match(/="([^"]*)"/);
  if (!m) return null;
  const parts = m[1].split(",");
  if (parts.length < 9) return null;
  return { fields: parts.slice(1) }; // 去掉首字段（名称）
}

async function fetchTwoMarketTurnoverYi(): Promise<number | null> {
  try {
    const text = await fetchSinaHq(["sh000001", "sz399001"]);
    let total = 0;
    let ok = 0;
    for (const line of text.split("\n")) {
      const parsed = parseHqLine(line);
      if (!parsed) continue;
      const turnoverYuan = Number(parsed.fields[8]);
      if (Number.isFinite(turnoverYuan) && turnoverYuan > 0) {
        total += turnoverYuan;
        ok++;
      }
    }
    if (ok < 2) return null;
    return Math.round((total / 1e8) * 10) / 10; // 保留 1 位小数
  } catch {
    return null;
  }
}

function toSinaSymbol(code: string, market?: number): string {
  if (market === 1) return `sh${code}`;
  if (market === 0) return `sz${code}`;
  // 兜底：6/9 开头沪市，0/3 开头深市，8/4 开头北交（暂归并到 sh，不影响计算）
  if (code.startsWith("6") || code.startsWith("9")) return `sh${code}`;
  return `sz${code}`;
}

// 拿"昨涨停今日溢价"：昨日涨停股的代码 → 今日开盘价 vs 昨收
async function fetchPrevLimitPremium(
  prevDateInt: string
): Promise<number | null> {
  try {
    const base = "https://push2ex.eastmoney.com";
    const ut = "7eea3edcaed734bea9cbfc24409ed989";
    const ztUrl = `${base}/getTopicZTPool?ut=${ut}&dpt=wz.ztzt&Pageindex=0&pagesize=400&sort=fbt%3Aasc&date=${prevDateInt}`;
    const zt = await fetchPool<ZTPoolItem>(ztUrl);
    const pool = zt.data?.pool ?? [];
    if (pool.length === 0) return null;

    const symbols = pool.map((x) => toSinaSymbol(x.c, x.m));
    // 分批 200 拉
    const premiums: number[] = [];
    for (let i = 0; i < symbols.length; i += 200) {
      const batch = symbols.slice(i, i + 200);
      const text = await fetchSinaHq(batch);
      for (const line of text.split("\n")) {
        const parsed = parseHqLine(line);
        if (!parsed) continue;
        const open = Number(parsed.fields[0]);
        const prevClose = Number(parsed.fields[1]);
        if (open > 0 && prevClose > 0) {
          premiums.push((open - prevClose) / prevClose);
        }
      }
    }

    if (premiums.length === 0) return null;
    const avg = premiums.reduce((a, b) => a + b, 0) / premiums.length;
    return Math.round(avg * 10000) / 100; // 转成百分比，保留 2 位
  } catch {
    return null;
  }
}

function previousDay(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - 1);
  return d;
}

export async function fetchEastmoneySentiment(targetDate?: Date): Promise<FetchedSentiment> {
  const date = targetDate ?? shanghaiNow();
  const dateInt = ymd(date);
  const dateDash = ymdDash(date);
  const prevDateInt = ymd(previousDay(date));

  const base = "https://push2ex.eastmoney.com";
  const ut = "7eea3edcaed734bea9cbfc24409ed989";
  const ztUrl = `${base}/getTopicZTPool?ut=${ut}&dpt=wz.ztzt&Pageindex=0&pagesize=400&sort=fbt%3Aasc&date=${dateInt}`;
  const dtUrl = `${base}/getTopicDTPool?ut=${ut}&dpt=wz.ztzt&Pageindex=0&pagesize=400&sort=fund%3Aasc&date=${dateInt}`;
  const zbUrl = `${base}/getTopicZBPool?ut=${ut}&dpt=wz.ztzt&Pageindex=0&pagesize=400&sort=fbt%3Aasc&date=${dateInt}`;

  const [zt, dt, zb, turnoverYi, prevLimitPremium] = await Promise.all([
    fetchPool<ZTPoolItem>(ztUrl),
    fetchPool<unknown>(dtUrl),
    fetchPool<unknown>(zbUrl),
    fetchTwoMarketTurnoverYi(),
    fetchPrevLimitPremium(prevDateInt),
  ]);

  if (zt.rc !== 0 || !zt.data) {
    throw new Error("东财涨停池返回异常");
  }

  const limitUpCount = zt.data.tc ?? 0;
  const limitDownCount = dt.data?.tc ?? 0;
  const brokenCount = zb.data?.tc ?? 0;

  const denom = limitUpCount + brokenCount;
  const sealRate = denom > 0 ? Math.round((limitUpCount / denom) * 1000) / 1000 : null;

  const maxConsecBoards =
    zt.data.pool?.reduce((m, x) => Math.max(m, x.lbc ?? 0), 0) ?? 0;

  const metrics: DailyMetricsInput = {
    tradeDate: dateDash,
    limitUpCount,
    limitDownCount,
    sealRate,
    maxConsecBoards,
    turnoverYi,
    prevLimitPremium,
    rawPayload: JSON.stringify({
      source: "eastmoney",
      fetchedAt: Date.now(),
      ztTotal: limitUpCount,
      dtTotal: limitDownCount,
      zbTotal: brokenCount,
      qdate: zt.data.qdate,
      turnoverYi,
      prevLimitPremium,
    }),
  };

  return { metrics, source: "eastmoney" };
}
