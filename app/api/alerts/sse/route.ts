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
    async start(controller) {
      const sendUpdate = async () => {
        try {
          const stats = await getAlertStats(userId);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(stats)}\n\n`));
        } catch (e) {
          console.error("SSE Update Error:", e);
        }
      };

      await sendUpdate();

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
