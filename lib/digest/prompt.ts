/**
 * 盘后分析 Prompt 构建
 */

import type { TechnicalResult, IndexData, SignalSummary } from "@/lib/technical/types";
import { summarize } from "@/lib/technical/signals";

type DigestInput = {
  tradeDate: string;
  analyses: TechnicalResult[];
  market: {
    sh: IndexData | null;
    sz: IndexData | null;
    cy: IndexData | null;
  };
  news?: string[];
};

const RATING_ZH = { bullish: "偏多", neutral: "中性", bearish: "偏空" } as const;
const BIAS_ICON = { bullish: "🔴", neutral: "⚪", bearish: "🟢" } as const;

function formatIndex(name: string, data: IndexData | null): string {
  if (!data) return `${name}：数据暂缺`;
  const dir = data.pctChg >= 0 ? "▲" : "▼";
  return `${name}：${data.close.toFixed(2)} ${dir}${Math.abs(data.pctChg).toFixed(2)}%`;
}

function formatStockSection(t: TechnicalResult, summary: SignalSummary): string {
  const lines: string[] = [];

  lines.push(`【${t.stockName}（${t.stockCode}）】`);
  const dir = t.quote.pctChg >= 0 ? "▲" : "▼";
  lines.push(`今日：开${t.quote.open} 高${t.quote.high} 低${t.quote.low} 收${t.quote.close}，${dir}${Math.abs(t.quote.pctChg).toFixed(2)}%`);
  lines.push(`成交量：${(t.volume.current / 10000).toFixed(0)}万手，量比MA5=${t.volume.ratioVsMa5}x，量比MA20=${t.volume.ratioVsMa20}x，${t.quote.turnoverRate ? `换手率${t.quote.turnoverRate.toFixed(2)}%` : ""}`);
  lines.push(`均线：MA5=${t.ma.ma5} MA10=${t.ma.ma10} MA20=${t.ma.ma20} MA60=${t.ma.ma60}，${t.ma.alignment === "bullish" ? "多头排列" : t.ma.alignment === "bearish" ? "空头排列" : "交织"}`);
  lines.push(`MACD：DIF=${t.macd.dif} DEA=${t.macd.dea} 柱=${t.macd.histogram}，${t.macd.signal === "golden_cross" ? "今日金叉" : t.macd.signal === "death_cross" ? "今日死叉" : t.macd.signal === "bullish" ? "多头" : t.macd.signal === "bearish" ? "空头" : ""}`);
  lines.push(`KDJ：K=${t.kdj.k} D=${t.kdj.d} J=${t.kdj.j}，${t.kdj.signal === "golden_cross" ? "今日金叉" : t.kdj.signal === "death_cross" ? "今日死叉" : t.kdj.signal === "overbought" ? "超买" : t.kdj.signal === "oversold" ? "超卖" : ""}`);
  lines.push(`BOLL：上轨${t.boll.upper} 中轨${t.boll.middle} 下轨${t.boll.lower}，${t.boll.position === "above_upper" ? "突破上轨" : t.boll.position === "near_upper" ? "接近上轨" : t.boll.position === "below_lower" ? "跌破下轨" : t.boll.position === "near_lower" ? "接近下轨" : "中轨附近"}`);
  lines.push(`RSI：RSI6=${t.rsi.rsi6} RSI12=${t.rsi.rsi12} RSI24=${t.rsi.rsi24}，${t.rsi.signal === "overbought" ? "超买" : t.rsi.signal === "oversold" ? "超卖" : "中性"}`);
  lines.push(`信号汇总：${BIAS_ICON[summary.rating]} ${RATING_ZH[summary.rating]}（多${summary.signals.filter(s => s.bias === "bullish").length} 中${summary.signals.filter(s => s.bias === "neutral").length} 空${summary.signals.filter(s => s.bias === "bearish").length}）`);

  return lines.join("\n");
}

export function buildDigestPrompt(input: DigestInput): string {
  const { tradeDate, analyses, market, news } = input;

  const summaries = analyses.map((a) => ({
    analysis: a,
    summary: summarize(a),
  }));

  const dateStr = `${tradeDate.slice(0, 4)}-${tradeDate.slice(4, 6)}-${tradeDate.slice(6, 8)}`;

  const lines: string[] = [
    `你是一个A股技术分析助手，帮助个人投资者做收盘后的盘面复盘。`,
    `请根据以下 ${dateStr} 收盘后的数据，为用户生成一份简明的"盘后分析简报"。`,
    ``,
    `【重要约束】`,
    `- 你是分析工具，不是投资顾问。使用"观察到""值得关注""技术面显示"等客观措辞`,
    `- 不要给出具体买卖建议或目标价位`,
    `- 不要使用"建议买入/卖出/加仓/减仓"等投顾用语`,
    `- 每只股票的分析控制在 100-200 字`,
    `- 最后给出"明日关注要点"，列出每只股票需要观察的关键价位或信号`,
    ``,
    `【大盘环境】`,
    formatIndex("上证指数", market.sh),
    formatIndex("深证成指", market.sz),
    formatIndex("创业板指", market.cy),
    ``,
  ];

  // 个股数据
  for (const { analysis, summary } of summaries) {
    lines.push(formatStockSection(analysis, summary));
    lines.push(``);
  }

  // 新闻
  if (news && news.length > 0) {
    lines.push(`【相关消息】`);
    for (const n of news.slice(0, 8)) {
      lines.push(`- ${n}`);
    }
    lines.push(``);
  }

  lines.push(
    `【输出格式】`,
    `1. 先用一句话总结今日大盘环境和整体情绪`,
    `2. 对每只股票分别分析，标题格式："## 股票名（代码）—— 偏多/中性/偏空"`,
    `   内容包括：技术面总结（重点指标信号）、量价分析、关键位置，如有消息面则附上`,
    `3. 最后一节"## 明日关注"，逐只股票列出需要观察的关键价位或信号`,
    ``,
    `语气要直接、数据驱动，不要泛泛而谈。如果某个指标出现矛盾信号，要明确指出。`,
  );

  return lines.join("\n");
}

/**
 * 生成不依赖 AI 的纯指标摘要文本（DeepSeek 不可用时的降级方案）
 */
export function buildFallbackText(input: DigestInput): string {
  const { tradeDate, analyses, market } = input;
  const dateStr = `${tradeDate.slice(0, 4)}-${tradeDate.slice(4, 6)}-${tradeDate.slice(6, 8)}`;

  const lines: string[] = [
    `# 盘后技术指标 · ${dateStr}`,
    ``,
    `**大盘**：${formatIndex("上证", market.sh)} | ${formatIndex("深证", market.sz)} | ${formatIndex("创业板", market.cy)}`,
    ``,
  ];

  for (const a of analyses) {
    const s = summarize(a);
    lines.push(`## ${a.stockName}（${a.stockCode}）—— ${RATING_ZH[s.rating]}`);
    const dir = a.quote.pctChg >= 0 ? "▲" : "▼";
    lines.push(`收${a.quote.close} ${dir}${Math.abs(a.quote.pctChg).toFixed(2)}%`);
    lines.push(``);
    for (const sig of s.signals) {
      lines.push(`- **${sig.category}**：${sig.text}`);
    }
    lines.push(``);
  }

  lines.push(`> 以上为技术指标自动计算结果，仅供参考，不构成投资建议。`);

  return lines.join("\n");
}
