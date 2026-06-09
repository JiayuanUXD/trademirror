import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { auth } from "@/auth";
import { getDigestByDate, findExistingShare, createDigestShare } from "@/lib/db/queries/digests";

/** POST /api/digest/share — 生成分享短链 token */
export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as { tradeDate?: string };
  const tradeDate = body.tradeDate;
  if (!tradeDate || !/^\d{8}$/.test(tradeDate)) {
    return NextResponse.json({ error: "Invalid tradeDate" }, { status: 400 });
  }

  // 同日已有分享链接则复用
  const existing = await findExistingShare(tradeDate, userId);
  if (existing) {
    return NextResponse.json({ token: existing.token });
  }

  // 查原始简报
  const digest = await getDigestByDate(tradeDate, userId);
  if (!digest) {
    return NextResponse.json({ error: "Digest not found" }, { status: 404 });
  }

  // 生成 URL-safe 短 token（8字节 = 11字符 base64url）
  const token = randomBytes(8).toString("base64url");

  await createDigestShare({
    token,
    tradeDate: digest.tradeDate,
    marketData: digest.marketData,
    stockAnalyses: digest.stockAnalyses,
    digestText: digest.digestText,
    userId,
    expiresAt: null, // 永不过期
  });

  return NextResponse.json({ token });
}
