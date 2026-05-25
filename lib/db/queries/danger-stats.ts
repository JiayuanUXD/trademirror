import { and, desc, eq, gte, isNotNull, lt, lte, sql } from "drizzle-orm";
import dayjs from "dayjs";
import { db } from "../index";
import { decisions } from "../schema";

export type FomoStats = {
  total: number;
  losses: number;
  lossRate: number;
};

export type CalmStats = FomoStats;

export type NotAlignStats = {
  total: number;
  losses: number;
};

export type RecentDecisionInfo = {
  id: string;
  stockName: string;
  createdAt: number;
  minutesAgo: number;
};

export async function getFomoStats(userId: string): Promise<FomoStats> {
  const rows = await db
    .select({ ret: decisions.return30Days })
    .from(decisions)
    .where(
      and(
        gte(decisions.fomoScore, 7),
        isNotNull(decisions.return30Days),
        eq(decisions.status, "ACTIVE"),
        eq(decisions.userId, userId),
      )
    );

  const total = rows.length;
  const losses = rows.filter((r) => (r.ret ?? 0) < 0).length;
  const lossRate = total === 0 ? 0 : losses / total;
  return { total, losses, lossRate };
}

export async function getCalmStats(userId: string): Promise<CalmStats> {
  const rows = await db
    .select({ ret: decisions.return30Days })
    .from(decisions)
    .where(
      and(
        lte(decisions.calmScore, 4),
        isNotNull(decisions.return30Days),
        eq(decisions.status, "ACTIVE"),
        eq(decisions.userId, userId),
      )
    );

  const total = rows.length;
  const losses = rows.filter((r) => (r.ret ?? 0) < 0).length;
  const lossRate = total === 0 ? 0 : losses / total;
  return { total, losses, lossRate };
}

export async function getNotAlignThisMonth(userId: string): Promise<NotAlignStats> {
  const monthStart = dayjs().startOf("month").valueOf();
  const monthEnd = dayjs().endOf("month").valueOf();

  const rows = await db
    .select({ ret: decisions.return30Days })
    .from(decisions)
    .where(
      and(
        eq(decisions.systemAlignment, "NOT_ALIGN"),
        gte(sql`COALESCE(${decisions.tradedAt}, ${decisions.createdAt})`, monthStart),
        lte(sql`COALESCE(${decisions.tradedAt}, ${decisions.createdAt})`, monthEnd),
        eq(decisions.status, "ACTIVE"),
        eq(decisions.userId, userId),
      )
    );

  const total = rows.length;
  const losses = rows.filter((r) => (r.ret ?? 0) < 0).length;
  return { total, losses };
}

export async function getMostRecentDecision(
  userId: string,
  beforeTs: number = Date.now()
): Promise<RecentDecisionInfo | null> {
  const rows = await db
    .select({
      id: decisions.id,
      stockName: decisions.stockName,
      createdAt: decisions.createdAt,
    })
    .from(decisions)
    .where(
      and(
        eq(decisions.status, "ACTIVE"),
        eq(decisions.userId, userId),
        lt(decisions.createdAt, beforeTs),
      )
    )
    .orderBy(desc(decisions.createdAt))
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  return {
    id: row.id,
    stockName: row.stockName,
    createdAt: row.createdAt,
    minutesAgo: Math.floor((beforeTs - row.createdAt) / 60_000),
  };
}
