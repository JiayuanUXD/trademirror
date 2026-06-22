import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "../index";
import { screenerPoolSnapshot, screenerCandidate } from "../schema";
import type { FunnelResult } from "@/lib/screener/funnel";

export type ScreenerSnapshot = typeof screenerPoolSnapshot.$inferSelect;
export type ScreenerCandidateRow = typeof screenerCandidate.$inferSelect;

export type SnapshotWithCandidates = {
  snapshot: ScreenerSnapshot;
  candidates: ScreenerCandidateRow[];
};

// ─── 验证统计 ────────────────────────────────────────────────────────────────

export type TagStat = {
  tag: string;
  sampleCount: number;
  filledCount: number;
  winRateT1: number | null;
  winRateT3: number | null;
  winRateT5: number | null;
  avgRetT1: number | null;
  avgRetT3: number | null;
  avgRetT5: number | null;
};

export type VerificationStats = {
  totalCandidates: number;
  totalFilled: number;
  overall: {
    winRateT1: number | null;
    avgRetT1: number | null;
    winRateT3: number | null;
    avgRetT3: number | null;
    winRateT5: number | null;
    avgRetT5: number | null;
  };
  byTag: TagStat[];
};

function calcWinRate(values: (number | null)[]): number | null {
  const valid = values.filter((v): v is number => v != null);
  if (valid.length < 7) return null;
  const wins = valid.filter((v) => v > 0).length;
  return (wins / valid.length) * 100;
}

function calcAvg(values: (number | null)[]): number | null {
  const valid = values.filter((v): v is number => v != null);
  if (valid.length < 7) return null;
  return valid.reduce((s, v) => s + v, 0) / valid.length;
}

export async function getVerificationStats(userId: string): Promise<VerificationStats> {
  const rows = await db
    .select({
      reasonTags: screenerCandidate.reasonTags,
      retT1: screenerCandidate.retT1,
      retT3: screenerCandidate.retT3,
      retT5: screenerCandidate.retT5,
      filledAt: screenerCandidate.filledAt,
    })
    .from(screenerCandidate)
    .where(eq(screenerCandidate.userId, userId));

  const totalCandidates = rows.length;
  const totalFilled = rows.filter((r) => r.filledAt != null).length;

  // Overall stats
  const allT1 = rows.map((r) => r.retT1);
  const allT3 = rows.map((r) => r.retT3);
  const allT5 = rows.map((r) => r.retT5);

  const overall = {
    winRateT1: calcWinRate(allT1),
    avgRetT1: calcAvg(allT1),
    winRateT3: calcWinRate(allT3),
    avgRetT3: calcAvg(allT3),
    winRateT5: calcWinRate(allT5),
    avgRetT5: calcAvg(allT5),
  };

  // By tag
  const tagMap = new Map<string, { retT1: (number | null)[]; retT3: (number | null)[]; retT5: (number | null)[]; count: number; filled: number }>();

  for (const r of rows) {
    let tags: string[] = [];
    try { tags = JSON.parse(r.reasonTags); } catch { tags = []; }
    for (const tag of tags) {
      if (!tagMap.has(tag)) tagMap.set(tag, { retT1: [], retT3: [], retT5: [], count: 0, filled: 0 });
      const entry = tagMap.get(tag)!;
      entry.count++;
      if (r.filledAt != null) entry.filled++;
      entry.retT1.push(r.retT1);
      entry.retT3.push(r.retT3);
      entry.retT5.push(r.retT5);
    }
  }

  const byTag: TagStat[] = [];
  for (const [tag, data] of tagMap) {
    byTag.push({
      tag,
      sampleCount: data.count,
      filledCount: data.filled,
      winRateT1: calcWinRate(data.retT1),
      winRateT3: calcWinRate(data.retT3),
      winRateT5: calcWinRate(data.retT5),
      avgRetT1: calcAvg(data.retT1),
      avgRetT3: calcAvg(data.retT3),
      avgRetT5: calcAvg(data.retT5),
    });
  }

  byTag.sort((a, b) => b.filledCount - a.filledCount);

  return { totalCandidates, totalFilled, overall, byTag };
}

export async function createSnapshot(args: {
  userId: string;
  tradeDate: string;
  result: FunnelResult;
}): Promise<SnapshotWithCandidates> {
  const { userId, tradeDate, result } = args;
  const now = Date.now();
  const snapshotId = crypto.randomUUID();

  // 同一交易日多次扫描只保留最后一次
  const oldSnaps = await db
    .select({ id: screenerPoolSnapshot.id })
    .from(screenerPoolSnapshot)
    .where(
      and(
        eq(screenerPoolSnapshot.userId, userId),
        eq(screenerPoolSnapshot.tradeDate, tradeDate)
      )
    );
  if (oldSnaps.length > 0) {
    const oldIds = oldSnaps.map((s) => s.id);
    await db.delete(screenerCandidate).where(inArray(screenerCandidate.snapshotId, oldIds));
    await db.delete(screenerPoolSnapshot).where(inArray(screenerPoolSnapshot.id, oldIds));
  }

  const snapshot: ScreenerSnapshot = {
    id: snapshotId,
    userId,
    tradeDate,
    runAt: now,
    stageAtRun: result.stage,
    gateStatus: result.gateStatus,
    gateMaxSize: result.gateMaxSize,
    poolSize: result.poolSize,
    universeSize: result.universeSize,
    filteredSummary: JSON.stringify(result.filteredSummary),
    createdAt: now,
  };

  const candidateRows: ScreenerCandidateRow[] = result.candidates.map((c) => ({
    id: crypto.randomUUID(),
    userId,
    snapshotId,
    symbol: c.symbol,
    name: c.name,
    price: c.price,
    turnoverYi: c.turnoverYi,
    turnoverRatePct: c.turnoverRatePct,
    volumeRatio: c.volumeRatio,
    amplitudePct: c.amplitudePct,
    score: c.score,
    reasonTags: JSON.stringify(c.reasonTags),
    retT1: null,
    retT3: null,
    retT5: null,
    filledAt: null,
    createdAt: now,
  }));

  await db.insert(screenerPoolSnapshot).values(snapshot);
  if (candidateRows.length > 0) {
    await db.insert(screenerCandidate).values(candidateRows);
  }

  return { snapshot, candidates: candidateRows };
}

export async function getLatestSnapshot(
  userId: string
): Promise<SnapshotWithCandidates | null> {
  const [snap] = await db
    .select()
    .from(screenerPoolSnapshot)
    .where(eq(screenerPoolSnapshot.userId, userId))
    .orderBy(desc(screenerPoolSnapshot.runAt))
    .limit(1);

  if (!snap) return null;

  const candidates = await db
    .select()
    .from(screenerCandidate)
    .where(
      and(
        eq(screenerCandidate.userId, userId),
        eq(screenerCandidate.snapshotId, snap.id)
      )
    )
    .orderBy(desc(screenerCandidate.turnoverYi));

  return { snapshot: snap, candidates };
}

export async function listSnapshots(
  userId: string,
  limit = 30
): Promise<ScreenerSnapshot[]> {
  return db
    .select()
    .from(screenerPoolSnapshot)
    .where(eq(screenerPoolSnapshot.userId, userId))
    .orderBy(desc(screenerPoolSnapshot.runAt))
    .limit(limit);
}

export async function getHistoryWithCandidates(
  userId: string,
  limit = 14
): Promise<SnapshotWithCandidates[]> {
  const snaps = await db
    .select()
    .from(screenerPoolSnapshot)
    .where(eq(screenerPoolSnapshot.userId, userId))
    .orderBy(desc(screenerPoolSnapshot.runAt))
    .limit(limit);

  if (snaps.length === 0) return [];

  const ids = snaps.map((s) => s.id);
  const allCandidates = await db
    .select()
    .from(screenerCandidate)
    .where(eq(screenerCandidate.userId, userId));

  const idSet = new Set(ids);
  const grouped = new Map<string, ScreenerCandidateRow[]>();
  for (const c of allCandidates) {
    if (!idSet.has(c.snapshotId)) continue;
    if (!grouped.has(c.snapshotId)) grouped.set(c.snapshotId, []);
    grouped.get(c.snapshotId)!.push(c);
  }

  for (const list of grouped.values()) {
    list.sort((a, b) => b.score - a.score || b.turnoverYi - a.turnoverYi);
  }

  return snaps.map((s) => ({ snapshot: s, candidates: grouped.get(s.id) ?? [] }));
}
