import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

function getSecid(code: string, market: string): string {
  if (market === "SH") return `1.${code}`;
  return `0.${code}`;
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const code = req.nextUrl.searchParams.get("code")?.trim();
  const market = req.nextUrl.searchParams.get("market")?.trim();

  if (!code || !market) {
    return NextResponse.json({ error: "Missing code or market" }, { status: 400 });
  }

  if (!/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: "Invalid stock code" }, { status: 400 });
  }

  const validMarkets = ["SH", "SZ", "BJ"];
  if (!validMarkets.includes(market)) {
    return NextResponse.json({ error: "Invalid market" }, { status: 400 });
  }

  try {
    const secid = getSecid(code, market);
    const url = `https://push2.eastmoney.com/api/qt/stock/get?secid=${secid}&fields=f43,f57,f58`;
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) {
      return NextResponse.json({ error: "Failed to fetch price" }, { status: 502 });
    }

    const data = await res.json() as { data?: { f43?: number; f57?: string; f58?: string } };
    const price = data?.data?.f43;
    const name = data?.data?.f58;

    if (typeof price !== "number" || price <= 0) {
      return NextResponse.json({ error: "Price not available" }, { status: 404 });
    }

    return NextResponse.json({
      price: price / 100, // EastMoney returns price in fen
      name: name ?? "",
      code: data?.data?.f57 ?? code,
    });
  } catch {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }
}
