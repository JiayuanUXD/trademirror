import { db } from "@/lib/db";
import { dailyDigests, digestShares } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";

export type DigestRow = {
  id: string;
  tradeDate: string;
  marketData: string;
  stockAnalyses: string;
  digestText: string;
  generatedAt: number;
  createdAt: number;
  userId: string;
};

export async function getDigestByDate(tradeDate: string, userId: string): Promise<DigestRow | null> {
  const rows = await db
    .select()
    .from(dailyDigests)
    .where(and(eq(dailyDigests.tradeDate, tradeDate), eq(dailyDigests.userId, userId)))
    .limit(1);

  return (rows[0] as DigestRow) ?? null;
}

export async function saveDigest(data: {
  id: string;
  tradeDate: string;
  marketData: string;
  stockAnalyses: string;
  digestText: string;
  userId: string;
}): Promise<void> {
  const now = Date.now();
  await db
    .insert(dailyDigests)
    .values({
      id: data.id,
      tradeDate: data.tradeDate,
      marketData: data.marketData,
      stockAnalyses: data.stockAnalyses,
      digestText: data.digestText,
      generatedAt: now,
      createdAt: now,
      userId: data.userId,
    })
    .onConflictDoNothing();
}

export async function updateDigest(id: string, data: {
  marketData?: string;
  stockAnalyses?: string;
  digestText?: string;
}): Promise<void> {
  await db
    .update(dailyDigests)
    .set({ ...data, generatedAt: Date.now() })
    .where(eq(dailyDigests.id, id));
}

export async function deleteDigestByDate(tradeDate: string, userId: string): Promise<void> {
  await db
    .delete(dailyDigests)
    .where(and(eq(dailyDigests.tradeDate, tradeDate), eq(dailyDigests.userId, userId)));
}

export async function listRecentDigests(userId: string, limit = 10): Promise<DigestRow[]> {
  const rows = await db
    .select()
    .from(dailyDigests)
    .where(eq(dailyDigests.userId, userId))
    .orderBy(desc(dailyDigests.tradeDate))
    .limit(limit);

  return rows as DigestRow[];
}

// ─── Digest Shares ─────────────────────────────────────────────────────────

export type DigestShareRow = {
  token: string;
  tradeDate: string;
  marketData: string;
  stockAnalyses: string;
  digestText: string;
  createdAt: number;
  expiresAt: number | null;
  userId: string;
};

export async function createDigestShare(data: {
  token: string;
  tradeDate: string;
  marketData: string;
  stockAnalyses: string;
  digestText: string;
  userId: string;
  expiresAt?: number | null;
}): Promise<void> {
  await db
    .insert(digestShares)
    .values({
      token: data.token,
      tradeDate: data.tradeDate,
      marketData: data.marketData,
      stockAnalyses: data.stockAnalyses,
      digestText: data.digestText,
      createdAt: Date.now(),
      expiresAt: data.expiresAt ?? null,
      userId: data.userId,
    })
    .onConflictDoNothing();
}

export async function getDigestShare(token: string): Promise<DigestShareRow | null> {
  const rows = await db
    .select()
    .from(digestShares)
    .where(eq(digestShares.token, token))
    .limit(1);

  return (rows[0] as DigestShareRow) ?? null;
}

/** 查找某用户某日是否已有分享链接 */
export async function findExistingShare(tradeDate: string, userId: string): Promise<DigestShareRow | null> {
  const rows = await db
    .select()
    .from(digestShares)
    .where(and(eq(digestShares.tradeDate, tradeDate), eq(digestShares.userId, userId)))
    .limit(1);

  return (rows[0] as DigestShareRow) ?? null;
}
