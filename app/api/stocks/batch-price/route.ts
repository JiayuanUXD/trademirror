import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

/**
 * Batch fetch current prices for multiple stocks.
 * Uses Sina Finance API which supports comma-separated stock codes.
 *
 * GET /api/stocks/batch-price?stocks=sh600176,sz000001,sh515880
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const stocks = req.nextUrl.searchParams.get("stocks")?.trim();
  if (!stocks) {
    return NextResponse.json({ error: "Missing stocks param" }, { status: 400 });
  }

  // Validate format: comma-separated sh/sz/bj + 6-digit codes
  const codes = stocks.split(",").filter(Boolean);
  if (codes.length === 0 || codes.length > 50) {
    return NextResponse.json({ error: "1-50 stock codes allowed" }, { status: 400 });
  }

  const validPattern = /^(sh|sz|bj)\d{6}$/;
  if (!codes.every((c) => validPattern.test(c))) {
    return NextResponse.json({ error: "Invalid stock code format" }, { status: 400 });
  }

  try {
    const url = `http://hq.sinajs.cn/list=${codes.join(",")}`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(5000),
      headers: { Referer: "http://finance.sina.com.cn" },
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Upstream failed" }, { status: 502 });
    }

    const text = await res.text();
    const prices: Record<string, number> = {};

    // Parse Sina response: var hq_str_sh600176="name,open,prevClose,current,...";
    for (const line of text.split("\n")) {
      const match = line.match(/hq_str_(\w+)="([^"]*)"/);
      if (!match) continue;
      const [, fullCode, data] = match;
      const fields = data.split(",");
      if (fields.length < 4) continue;

      const current = parseFloat(fields[3]);
      if (!isNaN(current) && current > 0) {
        // Extract the 6-digit code from the full code (e.g., sh600176 → 600176)
        const code6 = fullCode.replace(/^(sh|sz|bj)/, "");
        prices[code6] = current;
      }
    }

    return NextResponse.json(prices);
  } catch {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }
}
