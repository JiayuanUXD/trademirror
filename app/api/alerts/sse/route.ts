import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { getAlertStats } from "@/lib/db/queries/alerts";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      let timer: ReturnType<typeof setInterval> | null = null;

      // 唯一安全的写入方式：所有 enqueue 都 try-catch
      function safeEnqueue(data: string) {
        try {
          controller.enqueue(encoder.encode(data));
          return true;
        } catch {
          // Controller already closed — stop everything
          if (timer) { clearInterval(timer); timer = null; }
          return false;
        }
      }

      async function tick() {
        try {
          const stats = await getAlertStats(userId!);
          safeEnqueue(`data: ${JSON.stringify(stats)}\n\n`);
        } catch {
          // DB error or controller closed — just skip this tick
        }
      }

      // 首次推送
      void tick();

      // 定时推送
      timer = setInterval(() => { void tick(); }, 10_000);

      // 客户端断开
      req.signal.addEventListener("abort", () => {
        if (timer) { clearInterval(timer); timer = null; }
      });
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
