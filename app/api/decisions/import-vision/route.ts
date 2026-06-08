import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

function makeProxyFetch(): ((url: string, init: RequestInit) => Promise<Response>) | null {
  const proxy = process.env.HTTPS_PROXY || process.env.https_proxy;
  if (!proxy) return null;
  // Only pull in undici when a proxy is actually configured
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { ProxyAgent, fetch: undiciFetch } = require("undici") as typeof import("undici");
  const dispatcher = new ProxyAgent(proxy);
  return (url: string, init: RequestInit) =>
    undiciFetch(url, { ...init, dispatcher } as Parameters<typeof undiciFetch>[1]) as unknown as Promise<Response>;
}

export type RecognizedTrade = {
  stockCode: string;
  stockName: string;
  action: "BUY" | "ADD" | "SELL" | "REDUCE" | "CLEAR";
  price: number;
  quantity: number;
  tradedAt: string | null; // ISO 8601 or null
  confidence: number;
};

type VisionResponse = {
  trades: RecognizedTrade[];
  errors: { imageIndex: number; reason: string }[];
};

const SYSTEM_PROMPT = `你是一个 A 股交易记录解析助手。
请分析图片中的交易记录，提取所有交易明细，以 JSON 数组返回。

每条记录格式：
{
  "stockCode": "6位股票代码，如 600519",
  "stockName": "股票名称",
  "action": "BUY/SELL/ADD/REDUCE/CLEAR 之一：买入=BUY，卖出=SELL，加仓=ADD，减仓=REDUCE，清仓=CLEAR",
  "price": 成交均价（数字，单位元，不含货币符号），
  "quantity": 成交数量（整数，单位股，不含逗号），
  "tradedAt": "ISO 8601 格式时间，如 2024-05-18T09:30:00，无法识别返回 null",
  "confidence": 0到1之间的数字，表示本条记录整体识别置信度
}

规则：
- 只返回 JSON 数组，不要包含解释文字、markdown 代码块、注释
- 图片中没有交易记录返回 []
- stockCode：若图片中可见6位代码则直接填写；若未显示代码但能根据股票名称确认（如"沪电股份"=002463，"贵州茅台"=600519），可填写推断值；完全不确定则填 null
- 不支持港股/美股，遇到非A股代码返回 confidence < 0.5
- 数量单位是"股"，若图片显示为"手"则乘以 100`;

type Provider = "openai" | "gemini" | "deepseek";

type ApiFetch = (url: string, init: RequestInit) => Promise<Response>;

async function callVisionAPI(
  provider: Provider,
  apiKey: string,
  apiUrl: string,
  model: string,
  mimeType: string,
  base64: string,
  apiFetch: ApiFetch
): Promise<string> {
  if (provider === "gemini") {
    const url = `${apiUrl}/${model}:generateContent?key=${apiKey}`;
    const res = await apiFetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { inlineData: { mimeType, data: base64 } },
              { text: SYSTEM_PROMPT },
            ],
          },
        ],
        generationConfig: { maxOutputTokens: 8192 },
      }),
      signal: AbortSignal.timeout(55_000),
    });
    if (!res.ok) {
      const errText = await res.text();
      console.error("[vision/gemini] API error", res.status, errText.slice(0, 300));
      throw new Error(`API 错误 ${res.status}: ${errText.slice(0, 120)}`);
    }
    const json = await res.json() as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    console.log("[vision/gemini] raw response:", text.slice(0, 500));
    return text;
  }

  // OpenAI-compatible (openai + deepseek)
  const res = await apiFetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      max_tokens: 8192,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: `data:${mimeType};base64,${base64}`, detail: "high" },
            },
            { type: "text", text: SYSTEM_PROMPT },
          ],
        },
      ],
    }),
    signal: AbortSignal.timeout(55_000),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`API 错误 ${res.status}: ${errText.slice(0, 120)}`);
  }
  const json = await res.json() as {
    choices?: { message?: { content?: string } }[];
  };
  return json.choices?.[0]?.message?.content ?? "";
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Determine API provider — priority: VISION_API_KEY > OPENAI_API_KEY > GEMINI_API_KEY > DEEPSEEK_API_KEY
  const openaiKey = process.env.OPENAI_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;
  const deepseekKey = process.env.DEEPSEEK_API_KEY;
  const visionKey = process.env.VISION_API_KEY;

  let provider: Provider;
  let apiKey: string;

  if (visionKey ?? openaiKey) {
    provider = "openai";
    apiKey = (visionKey ?? openaiKey)!;
  } else if (geminiKey) {
    provider = "gemini";
    apiKey = geminiKey;
  } else if (deepseekKey) {
    provider = "deepseek";
    apiKey = deepseekKey;
  } else {
    return NextResponse.json(
      { error: "未配置视觉 API Key。请在环境变量中设置 OPENAI_API_KEY、GEMINI_API_KEY 或 DEEPSEEK_API_KEY。" },
      { status: 503 }
    );
  }

  const defaultUrl =
    provider === "gemini"
      ? "https://generativelanguage.googleapis.com/v1beta/models"
      : provider === "openai"
      ? "https://api.openai.com/v1/chat/completions"
      : "https://api.deepseek.com/chat/completions";
  const defaultModel =
    provider === "gemini" ? "gemini-2.5-flash" : provider === "openai" ? "gpt-4o" : "deepseek-chat";

  const apiUrl = process.env.VISION_API_URL ?? defaultUrl;
  const model = process.env.VISION_MODEL ?? defaultModel;
  console.log(`[vision] provider=${provider} model=${model}`);

  // Parse multipart form data
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "请求格式错误，需要 multipart/form-data" }, { status: 400 });
  }

  const files = formData.getAll("files") as File[];
  if (!files || files.length === 0) {
    return NextResponse.json({ error: "未上传文件" }, { status: 400 });
  }
  if (files.length > 5) {
    return NextResponse.json({ error: "单次最多上传 5 张图片" }, { status: 400 });
  }

  const allTrades: RecognizedTrade[] = [];
  const errors: { imageIndex: number; reason: string }[] = [];
  // Use proxy-aware fetch only when HTTPS_PROXY is configured; otherwise use native fetch
  const proxyFetch = makeProxyFetch();
  const apiFetch: ApiFetch = proxyFetch ?? ((url, init) => fetch(url, init));

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      errors.push({ imageIndex: i, reason: `不支持的格式 ${file.type}，请上传 JPG/PNG/WEBP` });
      continue;
    }
    if (file.size > 10 * 1024 * 1024) {
      errors.push({ imageIndex: i, reason: "文件超过 10MB 限制" });
      continue;
    }

    try {
      const arrayBuffer = await file.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString("base64");

      let raw: string;
      try {
        raw = await callVisionAPI(provider, apiKey, apiUrl, model, file.type, base64, apiFetch);
      } catch (err) {
        errors.push({
          imageIndex: i,
          reason: err instanceof Error ? err.message : "识别失败，请重试",
        });
        continue;
      }

      // Strip markdown code block if present (trim first to handle leading whitespace)
      const jsonStr = raw
        .trim()
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```\s*$/i, "")
        .trim();

      console.log("[vision] jsonStr preview:", JSON.stringify(jsonStr.slice(0, 300)));
      let trades: RecognizedTrade[];
      try {
        const parsed = JSON.parse(jsonStr) as unknown;
        if (!Array.isArray(parsed)) {
          console.error("[vision] not array, got:", typeof parsed, JSON.stringify(String(parsed)).slice(0, 100));
          throw new Error("Expected array");
        }
        trades = (parsed as Record<string, unknown>[])
          .filter((t) =>
            typeof t === "object" && t !== null &&
            typeof t.price === "number" &&
            typeof t.quantity === "number"
          )
          .map((t) => ({
            ...t,
            stockCode: typeof t.stockCode === "string" ? t.stockCode : "",
            stockName: typeof t.stockName === "string" ? t.stockName.replace(/\s/g, "") : "",
            action: (["BUY","ADD","SELL","REDUCE","CLEAR"].includes(t.action as string) ? t.action : "BUY") as RecognizedTrade["action"],
            price: t.price as number,
            quantity: t.quantity as number,
            tradedAt: typeof t.tradedAt === "string" ? t.tradedAt : null,
            confidence: typeof t.confidence === "number" ? t.confidence : 0.5,
          } as RecognizedTrade));
      } catch (parseErr) {
        console.error("[vision] JSON.parse failed:", parseErr, "jsonStr:", JSON.stringify(jsonStr.slice(0, 200)));
        errors.push({ imageIndex: i, reason: "AI 返回格式无法解析，请重试或使用更清晰的截图" });
        continue;
      }

      allTrades.push(...trades);
    } catch (err) {
      errors.push({
        imageIndex: i,
        reason: err instanceof Error ? err.message : "解析失败，请重试",
      });
    }
  }

  // Deduplicate by stockCode + tradedAt
  const seen = new Set<string>();
  const deduplicated = allTrades.filter((t) => {
    const key = `${t.stockCode}::${t.tradedAt ?? t.price}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const response: VisionResponse = { trades: deduplicated, errors };
  return NextResponse.json(response);
}
