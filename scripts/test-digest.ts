/**
 * 端到端测试：盘后分析生成
 * 用法：tsx scripts/test-digest.ts
 */

import { readFileSync } from "fs";
import { resolve } from "path";

// 手动加载 .env.local
const envPath = resolve(import.meta.dirname, "../.env.local");
const envContent = readFileSync(envPath, "utf-8");
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eqIdx = trimmed.indexOf("=");
  if (eqIdx === -1) continue;
  const key = trimmed.slice(0, eqIdx);
  const value = trimmed.slice(eqIdx + 1);
  if (!process.env[key]) process.env[key] = value;
}

async function main() {
  // 1. 测试 Tushare 连通性
  console.log("=== 1. Tushare 连通性 ===");
  const { getLastTradingDay, getDailyKline, getDailyBasic, getIndexForDate, toTushareCode } = await import("../lib/technical/tushare");

  const tradeDate = await getLastTradingDay();
  console.log(`最近交易日: ${tradeDate}`);

  // 2. 拉K线
  console.log("\n=== 2. K线数据 ===");
  const tsCode = toTushareCode("600176", "SH");
  const startDate = "20260401";
  const klines = await getDailyKline(tsCode, startDate, tradeDate);
  console.log(`${tsCode} K线条数: ${klines.length}`);
  if (klines.length > 0) {
    const last = klines[klines.length - 1];
    console.log(`最新: ${last.date} 收${last.close} 涨跌${last.pctChg}% 量${last.volume}`);
  }

  // 3. 基本面
  console.log("\n=== 3. 基本面 ===");
  const basic = await getDailyBasic(tsCode, tradeDate);
  if (basic) {
    console.log(`换手率: ${basic.turnoverRate}%, PE: ${basic.pe}, PB: ${basic.pb}`);
  } else {
    console.log("基本面数据暂缺");
  }

  // 4. 大盘
  console.log("\n=== 4. 大盘指数 ===");
  const market = await getIndexForDate(tradeDate);
  for (const [name, data] of Object.entries(market)) {
    if (data) {
      console.log(`${name}: ${data.close} ${data.pctChg >= 0 ? "▲" : "▼"}${Math.abs(data.pctChg).toFixed(2)}%`);
    }
  }

  // 5. 技术指标计算
  console.log("\n=== 5. 技术指标 ===");
  const { computeAll } = await import("../lib/technical/indicators");
  const result = computeAll(klines, "600176", "中国巨石", basic?.turnoverRate);
  console.log(`MA: MA5=${result.ma.ma5} MA10=${result.ma.ma10} MA20=${result.ma.ma20} MA60=${result.ma.ma60} [${result.ma.alignment}]`);
  console.log(`MACD: DIF=${result.macd.dif} DEA=${result.macd.dea} 柱=${result.macd.histogram} [${result.macd.signal}]`);
  console.log(`KDJ: K=${result.kdj.k} D=${result.kdj.d} J=${result.kdj.j} [${result.kdj.signal}]`);
  console.log(`BOLL: 上${result.boll.upper} 中${result.boll.middle} 下${result.boll.lower} [${result.boll.position}]`);
  console.log(`RSI: RSI6=${result.rsi.rsi6} RSI12=${result.rsi.rsi12} RSI24=${result.rsi.rsi24} [${result.rsi.signal}]`);
  console.log(`量能: 量比MA5=${result.volume.ratioVsMa5}x MA20=${result.volume.ratioVsMa20}x [${result.volume.trend}]`);

  // 6. 信号汇总
  console.log("\n=== 6. 信号汇总 ===");
  const { summarize } = await import("../lib/technical/signals");
  const summary = summarize(result);
  console.log(`综合评级: ${summary.rating}`);
  for (const s of summary.signals) {
    console.log(`  [${s.bias}] ${s.category}: ${s.text}`);
  }

  // 7. Prompt 构建
  console.log("\n=== 7. Prompt 预览（前500字）===");
  const { buildDigestPrompt } = await import("../lib/digest/prompt");
  const prompt = buildDigestPrompt({
    tradeDate,
    analyses: [result],
    market,
  });
  console.log(prompt.slice(0, 500));
  console.log(`... (总 ${prompt.length} 字符)`);

  // 8. AI 生成（可选）
  if (process.env.DEEPSEEK_API_KEY) {
    console.log("\n=== 8. AI 生成 ===");
    const { generateStreamWithAI } = await import("../lib/digest/generate");
    try {
      let charCount = 0;
      const fullText = await generateStreamWithAI(prompt, (chunk) => {
        process.stdout.write(chunk);
        charCount += chunk.length;
      });
      console.log(`\n\n--- AI 生成完成 (${charCount} 字符) ---`);
    } catch (err) {
      console.error("AI 生成失败:", err);
    }
  } else {
    console.log("\n=== 8. AI 生成（跳过，未配置 DEEPSEEK_API_KEY）===");
    const { buildFallbackText } = await import("../lib/digest/prompt");
    const fallback = buildFallbackText({ tradeDate, analyses: [result], market });
    console.log(fallback.slice(0, 500));
  }

  console.log("\n✅ 测试完成");
}

main().catch(console.error);
