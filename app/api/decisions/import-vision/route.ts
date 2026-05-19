import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { ProxyAgent, fetch as undiciFetch } from "undici";

function makeDispatcher() {
  const proxy = process.env.HTTPS_PROXY || process.env.https_proxy;
  return proxy ? new ProxyAgent(proxy) : undefined;
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
- 不支持港股/美股，遇到非A股代码返回 confidence < 0.5
- 数量单位是"股"，若图片显示为"手"则乘以 100`;

export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Determine API provider
  const openaiKey = process.env.OPENAI_API_KEY;
  const deepseekKey = process.env.DEEPSEEK_API_KEY;
  const apiKey = process.env.VISION_API_KEY ?? openaiKey ?? deepseekKey;

  if (!apiKey) {
    return NextResponse.json(
      { error: "未配置视觉 API Key。请在环境变量中设置 OPENAI_API_KEY 或 DEEPSEEK_API_KEY。" },
      { status: 503 }
    );
  }

  const isOpenAI = !!(process.env.VISION_API_KEY ?? openaiKey);
  const apiUrl =
    process.env.VISION_API_URL ??
    (isOpenAI
      ? "https://api.openai.com/v1/chat/completions"
      : "https://api.deepseek.com/chat/completions");
  const model = process.env.VISION_MODEL ?? (isOpenAI ? "gpt-4o" : "deepseek-chat");

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
  const dispatcher = makeDispatcher();

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
      const dataUrl = `data:${file.type};base64,${base64}`;

      const res = await undiciFetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          max_tokens: 2000,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "image_url",
                  image_url: { url: dataUrl, detail: "high" },
                },
                { type: "text", text: SYSTEM_PROMPT },
              ],
            },
          ],
        }),
        dispatcher,
        signal: AbortSignal.timeout(30_000),
      });

      if (!res.ok) {
        const errText = await res.text();
        errors.push({ imageIndex: i, reason: `API 错误 ${res.status}: ${errText.slice(0, 120)}` });
        continue;
      }

      const json = await res.json() as {
        choices?: { message?: { content?: string } }[];
      };
      const raw = json.choices?.[0]?.message?.content ?? "";

      // Strip markdown code block if present
      const jsonStr = raw
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```\s*$/, "")
        .trim();

      let trades: RecognizedTrade[];
      try {
        const parsed = JSON.parse(jsonStr) as unknown;
        if (!Array.isArray(parsed)) throw new Error("Expected array");
        trades = parsed.filter((t): t is RecognizedTrade =>
          typeof t === "object" && t !== null &&
          typeof (t as Record<string, unknown>).stockCode === "string" &&
          typeof (t as Record<string, unknown>).price === "number" &&
          typeof (t as Record<string, unknown>).quantity === "number"
        );
      } catch {
        errors.push({ imageIndex: i, reason: "AI 返回格式无法解析，请重试或使用更清晰的截图" });
        continue;
      }

      allTrades.push(...trades);
    } catch (err) {
      errors.push({
        imageIndex: i,
        reason: err instanceof Error ? err.message : "识别失败，请重试",
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
