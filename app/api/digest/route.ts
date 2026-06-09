import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getOrGenerateDigest, generateDigestStream, regenerateDigest } from "@/lib/digest/generate";
import { listRecentDigests, getDigestByDate } from "@/lib/db/queries/digests";

export const dynamic = "force-dynamic";
export const maxDuration = 30; // AI 生成可能需要较长时间

/**
 * GET /api/digest
 *   ?mode=stream  → SSE 流式返回（生成中实时推送）
 *   ?mode=cached   → 仅返回缓存（不触发生成）
 *   ?date=YYYYMMDD → 获取指定日期的分析
 *   ?list=1        → 返回最近 N 天的分析列表
 *   无参数         → 获取或生成当日分析（非流式）
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const mode = req.nextUrl.searchParams.get("mode");
  const date = req.nextUrl.searchParams.get("date");
  const list = req.nextUrl.searchParams.get("list");

  // 列表模式
  if (list) {
    const limit = Math.min(Number(list) || 10, 30);
    const digests = await listRecentDigests(userId, limit);
    return NextResponse.json(digests);
  }

  // 指定日期（仅读缓存）
  if (date) {
    const digest = await getDigestByDate(date, userId);
    if (!digest) {
      return NextResponse.json({ error: "该日期暂无分析" }, { status: 404 });
    }
    return NextResponse.json(digest);
  }

  // 流式模式
  if (mode === "stream") {
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        let closed = false;

        req.signal.addEventListener("abort", () => {
          closed = true;
        });

        try {
          await generateDigestStream(userId, (chunk) => {
            if (closed) return;
            try {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: chunk })}\n\n`));
            } catch {
              closed = true;
            }
          });

          if (!closed) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
          }
        } catch (err) {
          if (!closed) {
            const msg = err instanceof Error ? err.message : "生成失败";
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`));
          }
        } finally {
          if (!closed) {
            try { controller.close(); } catch { /* already closed */ }
          }
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
      },
    });
  }

  // 强制重新生成（忽略缓存）
  const refresh = req.nextUrl.searchParams.get("refresh");
  if (refresh === "1") {
    try {
      const result = await regenerateDigest(userId);
      return NextResponse.json(result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "生成失败";
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  }

  // 默认：非流式获取/生成
  try {
    const result = await getOrGenerateDigest(userId);
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "生成失败";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
