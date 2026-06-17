// Sina hq 行情统一抓取
//
// 两类 code 共用同一接口 http://hq.sinajs.cn/list=...
// - 普通股票（sh/sz/bj + 6 位）：fields[0]=name,1=open,2=prevClose,3=current
// - 简化指数（s_ 前缀）：fields[0]=name,1=close,2=pctChgPts,3=pctChg%
//
// 上游必须带 Referer 否则 403；GBK 内容里中文名我们不依赖（前端只用 code/price），
// 所以不做 latin1 解码，避免引入 iconv-lite。

export type SinaQuote = {
  code: string;       // 完整 code，例如 "sh600176" 或 "s_sh000001"
  name: string;       // 可能含乱码，调用方自行决定是否使用
  price: number;      // 当前价 / 收盘价
  prevClose: number;  // 昨收（指数侧用 close-pctChgPts 反推）
  open: number;       // 开盘（指数侧无，置 0）
  ts: number;         // 拉取时刻
};

export async function fetchSinaHq(codes: string[]): Promise<Map<string, SinaQuote>> {
  const result = new Map<string, SinaQuote>();
  if (codes.length === 0) return result;

  const url = `http://hq.sinajs.cn/list=${codes.join(",")}`;
  const res = await fetch(url, {
    signal: AbortSignal.timeout(5000),
    headers: { Referer: "http://finance.sina.com.cn" },
  });
  if (!res.ok) return result;

  const text = await res.text();
  const ts = Date.now();

  for (const line of text.split("\n")) {
    const m = line.match(/hq_str_(\w+)="([^"]*)"/);
    if (!m) continue;
    const [, code, data] = m;
    const f = data.split(",");
    if (f.length < 4) continue;

    const isIndex = code.startsWith("s_");

    let name: string, price: number, prevClose: number, open: number;
    if (isIndex) {
      name = f[0];
      price = parseFloat(f[1]);
      const pctChgPts = parseFloat(f[2]);
      prevClose = isFinite(price) && isFinite(pctChgPts) ? price - pctChgPts : NaN;
      open = 0;
    } else {
      name = f[0];
      open = parseFloat(f[1]);
      prevClose = parseFloat(f[2]);
      price = parseFloat(f[3]);
    }

    if (!isFinite(price) || price <= 0) continue;
    if (!isFinite(prevClose) || prevClose <= 0) continue;

    result.set(code, { code, name, price, prevClose, open: isFinite(open) ? open : 0, ts });
  }

  return result;
}
