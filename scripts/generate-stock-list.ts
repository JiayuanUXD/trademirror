/**
 * 从新浪财经 API 拉取全量 A 股列表，生成带拼音首字母的 JSON。
 * 输出：public/data/stock-list.json
 *
 * 用法：tsx scripts/generate-stock-list.ts
 */

import { writeFileSync } from "fs";
import { resolve } from "path";
import { pinyin } from "pinyin-pro";

type StockEntry = {
  /** 6 位代码 */
  c: string;
  /** 股票名称 */
  n: string;
  /** 市场 SH/SZ/BJ */
  m: "SH" | "SZ" | "BJ";
  /** 拼音首字母（小写，如 "zgjs"） */
  p: string;
};

function getPinyinInitials(name: string): string {
  return pinyin(name, { pattern: "first", toneType: "none", type: "array" })
    .join("")
    .toLowerCase();
}

function codeToMarket(code: string): "SH" | "SZ" | "BJ" {
  if (code.startsWith("6")) return "SH";
  if (code.startsWith("4") || code.startsWith("8")) return "BJ";
  return "SZ";
}

async function fetchSinaPage(node: string, page: number, num: number): Promise<{ code: string; name: string }[]> {
  const url = `http://vip.stock.finance.sina.com.cn/quotes_service/api/json_v2.php/Market_Center.getHQNodeData?page=${page}&num=${num}&sort=symbol&asc=1&node=${node}&symbol=&_s_r_a=init`;

  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(15000),
      headers: { "Referer": "http://vip.stock.finance.sina.com.cn" },
    });
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];
    return data.map((item: { code: string; name: string }) => ({
      code: item.code,
      name: item.name,
    }));
  } catch (err) {
    console.error(`  Error fetching ${node} page ${page}:`, err instanceof Error ? err.message : err);
    return [];
  }
}

async function fetchAllFromSina(node: string, label: string): Promise<StockEntry[]> {
  const PAGE_SIZE = 80;
  const results: StockEntry[] = [];
  let page = 1;

  while (true) {
    const items = await fetchSinaPage(node, page, PAGE_SIZE);
    if (items.length === 0) break;

    console.log(`  ${label}: page ${page}, got ${items.length}`);

    for (const item of items) {
      const code = item.code;
      const name = item.name.replace(/\s/g, "");
      if (!code || !name || code.length !== 6) continue;

      results.push({
        c: code,
        n: name,
        m: codeToMarket(code),
        p: getPinyinInitials(name),
      });
    }

    if (items.length < PAGE_SIZE) break;
    page++;
    // Rate limit
    await new Promise((r) => setTimeout(r, 300));
  }

  return results;
}

async function main() {
  console.log("Generating stock list with pinyin initials...\n");

  // hs_a = 全部 A 股（沪深 + 北交所）
  // etf_hq_fund = 全部 ETF
  const [stocks, etfs] = await Promise.all([
    fetchAllFromSina("hs_a", "全部A股"),
    fetchAllFromSina("etf_hq_fund", "ETF基金"),
  ]);
  stocks.push(...etfs);

  // Deduplicate by code
  const seen = new Set<string>();
  const deduped = stocks.filter((s) => {
    if (seen.has(s.c)) return false;
    seen.add(s.c);
    return true;
  });

  deduped.sort((a, b) => a.c.localeCompare(b.c));

  const outPath = resolve(import.meta.dirname || ".", "../public/data/stock-list.json");
  writeFileSync(outPath, JSON.stringify(deduped));

  const sizeKB = (Buffer.byteLength(JSON.stringify(deduped)) / 1024).toFixed(1);
  console.log(`\n✅ Generated ${deduped.length} stocks → ${outPath}`);
  console.log(`   File size: ${sizeKB} KB (uncompressed)`);

  // Show samples
  const samples = deduped.filter((s) => ["600176", "515880", "000001", "300750"].includes(s.c));
  for (const s of samples) {
    console.log(`   ${s.c} ${s.n} (${s.m}) → ${s.p}`);
  }
}

main().catch(console.error);
