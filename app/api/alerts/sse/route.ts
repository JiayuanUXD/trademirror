import { NextRequest } from "next/server";
import { getAlertStats } from "@/lib/db/queries/alerts";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const sendUpdate = async () => {
        try {
          const stats = await getAlertStats();
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(stats)}\n\n`));
        } catch (e) {
          console.error("SSE Update Error:", e);
        }
      };

      // Initial send
      await sendUpdate();

      // Poll every 10 seconds for "real-time" updates in SSE stream
      const interval = setInterval(sendUpdate, 10000);

      req.signal.addEventListener("abort", () => {
        clearInterval(interval);
        controller.close();
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
