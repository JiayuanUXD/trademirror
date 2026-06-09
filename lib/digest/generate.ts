/**
 * 盘后分析生成器
 * 1. 拉取持仓列表
 * 2. 批量获取K线 + 基本面
 * 3. 计算技术指标
 * 4. 获取大盘数据
 * 5. 构建 Prompt → DeepSeek 生成
 * 6. 存储到 DB
 */

import { ProxyAgent, fetch as undiciFetch } from "undici";
import { getHoldings } from "@/lib/db/queries/holdings";
import { getDigestByDate, saveDigest, deleteDigestByDate } from "@/lib/db/queries/digests";
import {
  getDailyKline,
  getDailyBasic,
  getIndexForDate,
  getLastTradingDay,
  toTushareCode,
} from "@/lib/technical/tushare";
import { computeAll } from "@/lib/technical/indicators";
import { buildDigestPrompt, buildFallbackText } from "./prompt";
import type { TechnicalResult, IndexData } from "@/lib/technical/types";
import type { Holding } from "@/types/holding";

function makeDispatcher() {
  const proxy = process.env.HTTPS_PROXY || process.env.https_proxy;
  return proxy ? new ProxyAgent(proxy) : undefined;
}

/**
 * 计算起始日期（往前推 N 个交易日大约需要 N*1.5 个自然日）
 */
function startDateForKline(endDate: string, tradingDays: number): string {
  const calDays = Math.ceil(tradingDays * 1.6);
  const d = new Date(
    Number(endDate.slice(0, 4)),
    Number(endDate.slice(4, 6)) - 1,
    Number(endDate.slice(6, 8)),
  );
  d.setDate(d.getDate() - calDays);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

// ─── 数据采集 ────────────────────────────────────────────────────────────────

type AnalysisData = {
  analyses: TechnicalResult[];
  market: { sh: IndexData | null; sz: IndexData | null; cy: IndexData | null };
};

async function collectData(
  holdings: Holding[],
  tradeDate: string,
): Promise<AnalysisData> {
  const startDate = startDateForKline(tradeDate, 70); // 多取一些确保 60 条

  // 并行获取所有个股K线 + 基本面 + 大盘
  const [indexData, ...stockResults] = await Promise.all([
    getIndexForDate(tradeDate),
    ...holdings.map(async (h) => {
      const tsCode = toTushareCode(h.stockCode, h.stockMarket);
      const [klines, basic] = await Promise.all([
        getDailyKline(tsCode, startDate, tradeDate),
        getDailyBasic(tsCode, tradeDate).catch(() => null),
      ]);

      if (klines.length < 20) return null; // 数据不足，跳过

      return computeAll(klines, h.stockCode, h.stockName, basic?.turnoverRate);
    }),
  ]);

  return {
    analyses: stockResults.filter((r): r is TechnicalResult => r !== null),
    market: indexData,
  };
}

// ─── AI 生成（流式）─────────────────────────────────────────────────────────

async function generateWithAI(prompt: string): Promise<string> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error("NO_API_KEY");

  const dispatcher = makeDispatcher();

  const res = await undiciFetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      stream: false, // 非流式，等完整结果
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    }),
    dispatcher,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`DeepSeek ${res.status}: ${errText.slice(0, 200)}`);
  }

  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };

  return json.choices?.[0]?.message?.content ?? "";
}

// ─── 流式生成（给前端 SSE 用）───────────────────────────────────────────────

export async function generateStreamWithAI(
  prompt: string,
  onChunk: (text: string) => void,
): Promise<string> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error("NO_API_KEY");

  const dispatcher = makeDispatcher();

  const res = await undiciFetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      stream: true,
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    }),
    dispatcher,
  });

  if (!res.ok || !res.body) {
    const errText = await res.text();
    throw new Error(`DeepSeek ${res.status}: ${errText.slice(0, 200)}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let fullText = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const data = trimmed.slice(5).trim();
      if (data === "[DONE]") continue;
      try {
        const json = JSON.parse(data) as {
          choices?: { delta?: { content?: string } }[];
        };
        const content = json.choices?.[0]?.delta?.content;
        if (content) {
          fullText += content;
          onChunk(content);
        }
      } catch {
        // ignore malformed chunks
      }
    }
  }

  return fullText;
}

// ─── 主入口 ──────────────────────────────────────────────────────────────────

export type DigestResult = {
  id: string;
  tradeDate: string;
  digestText: string;
  marketData: string;
  stockAnalyses: string;
  fromCache: boolean;
};

/**
 * 获取或生成盘后分析
 * - 如果当日已有缓存，直接返回
 * - 否则拉取数据 + AI 生成 + 存储
 */
export async function getOrGenerateDigest(userId: string): Promise<DigestResult> {
  const tradeDate = await getLastTradingDay();

  // 检查缓存
  const cached = await getDigestByDate(tradeDate, userId);
  if (cached && cached.digestText) {
    return {
      id: cached.id,
      tradeDate: cached.tradeDate,
      digestText: cached.digestText,
      marketData: cached.marketData,
      stockAnalyses: cached.stockAnalyses,
      fromCache: true,
    };
  }

  // 获取持仓
  const allHoldings = await getHoldings(userId);
  const holdings = allHoldings.filter((h) => h.status === "HOLDING");
  if (holdings.length === 0) {
    return {
      id: "",
      tradeDate,
      digestText: "当前没有持仓股票，无需生成盘后分析。",
      marketData: "{}",
      stockAnalyses: "[]",
      fromCache: false,
    };
  }

  // 采集数据
  const data = await collectData(holdings, tradeDate);

  if (data.analyses.length === 0) {
    return {
      id: "",
      tradeDate,
      digestText: "行情数据暂不可用，请稍后重试。",
      marketData: JSON.stringify(data.market),
      stockAnalyses: "[]",
      fromCache: false,
    };
  }

  const marketDataJson = JSON.stringify(data.market);
  const stockAnalysesJson = JSON.stringify(data.analyses);

  // 构建 Prompt
  const prompt = buildDigestPrompt({
    tradeDate,
    analyses: data.analyses,
    market: data.market,
  });

  // AI 生成 or 降级
  let digestText: string;
  try {
    digestText = await generateWithAI(prompt);
  } catch {
    // DeepSeek 不可用，降级为纯指标展示
    digestText = buildFallbackText({
      tradeDate,
      analyses: data.analyses,
      market: data.market,
    });
  }

  // 存储
  const id = `digest_${tradeDate}_${userId.slice(0, 8)}`;
  await saveDigest({
    id,
    tradeDate,
    marketData: marketDataJson,
    stockAnalyses: stockAnalysesJson,
    digestText,
    userId,
  });

  return {
    id,
    tradeDate,
    digestText,
    marketData: marketDataJson,
    stockAnalyses: stockAnalysesJson,
    fromCache: false,
  };
}

/**
 * 流式生成盘后分析（适用于前端 SSE）
 * 先采集数据并保存骨架，然后流式输出 AI 文本
 */
export async function generateDigestStream(
  userId: string,
  onChunk: (text: string) => void,
): Promise<DigestResult> {
  const tradeDate = await getLastTradingDay();

  // 检查缓存
  const cached = await getDigestByDate(tradeDate, userId);
  if (cached && cached.digestText) {
    onChunk(cached.digestText);
    return {
      id: cached.id,
      tradeDate: cached.tradeDate,
      digestText: cached.digestText,
      marketData: cached.marketData,
      stockAnalyses: cached.stockAnalyses,
      fromCache: true,
    };
  }

  // 获取持仓
  const allHoldings = await getHoldings(userId);
  const holdings = allHoldings.filter((h) => h.status === "HOLDING");
  if (holdings.length === 0) {
    const msg = "当前没有持仓股票，无需生成盘后分析。";
    onChunk(msg);
    return { id: "", tradeDate, digestText: msg, marketData: "{}", stockAnalyses: "[]", fromCache: false };
  }

  // 采集数据
  const data = await collectData(holdings, tradeDate);
  const marketDataJson = JSON.stringify(data.market);
  const stockAnalysesJson = JSON.stringify(data.analyses);

  if (data.analyses.length === 0) {
    const msg = "行情数据暂不可用，请稍后重试。";
    onChunk(msg);
    return { id: "", tradeDate, digestText: msg, marketData: marketDataJson, stockAnalyses: "[]", fromCache: false };
  }

  const prompt = buildDigestPrompt({
    tradeDate,
    analyses: data.analyses,
    market: data.market,
  });

  const id = `digest_${tradeDate}_${userId.slice(0, 8)}`;

  let digestText: string;
  try {
    digestText = await generateStreamWithAI(prompt, onChunk);
  } catch {
    digestText = buildFallbackText({
      tradeDate,
      analyses: data.analyses,
      market: data.market,
    });
    onChunk(digestText);
  }

  // 存储完整结果
  await saveDigest({
    id,
    tradeDate,
    marketData: marketDataJson,
    stockAnalyses: stockAnalysesJson,
    digestText,
    userId,
  });

  return { id, tradeDate, digestText, marketData: marketDataJson, stockAnalyses: stockAnalysesJson, fromCache: false };
}

/**
 * 强制重新生成盘后分析（删除旧缓存 → 重新走完整流程）
 * 用于修正数据错误后刷新已缓存的分析
 */
export async function regenerateDigest(userId: string): Promise<DigestResult> {
  const tradeDate = await getLastTradingDay();

  // 删除旧缓存
  await deleteDigestByDate(tradeDate, userId);

  // 重新走完整生成流程（getOrGenerateDigest 检查缓存时已被清空，会重新生成）
  return getOrGenerateDigest(userId);
}
