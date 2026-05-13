import { NextResponse } from "next/server";
import { ProxyAgent, fetch as undiciFetch } from "undici";
import { getDecisions } from "@/lib/db/queries/decisions";
import { getReviews } from "@/lib/db/queries/reviews";
import { getHoldings } from "@/lib/db/queries/holdings";
import { buildInsightContext, buildPrompt } from "@/lib/insights";

function makeDispatcher() {
  const proxy = process.env.HTTPS_PROXY || process.env.https_proxy;
  return proxy ? new ProxyAgent(proxy) : undefined;
}

export async function POST() {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "未配置 DEEPSEEK_API_KEY" }, { status: 503 });
  }

  const [decisions, reviews, holdings] = await Promise.all([
    getDecisions(200),
    getReviews(),
    getHoldings(),
  ]);

  const ctx = buildInsightContext(decisions, reviews, holdings, 30);
  const prompt = buildPrompt(ctx);
  const dispatcher = makeDispatcher();

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      try {
        const res = await undiciFetch("https://api.deepseek.com/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "deepseek-chat",
            stream: true,
            max_tokens: 600,
            messages: [{ role: "user", content: prompt }],
          }),
          dispatcher,
        });

        if (!res.ok || !res.body) {
          const err = await res.text();
          controller.enqueue(encoder.encode(`[API错误：${res.status} ${err}]`));
          controller.close();
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

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
              if (content) controller.enqueue(encoder.encode(content));
            } catch {
              // ignore malformed chunks
            }
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "生成失败";
        controller.enqueue(encoder.encode(`[错误：${msg}]`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
      "Cache-Control": "no-cache",
    },
  });
}
