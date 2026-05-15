import { db } from "../index";
import { users, decisions, holdings } from "../schema";
import { eq, sql, and, gte, count, desc } from "drizzle-orm";

export type AdminUser = {
  id: string;
  name: string | null;
  email: string;
  role: string;
  disabled: boolean;
  createdAt: number;
  passwordChangedAt: number | null;
  decisionCount: number;
  activeHoldingCount: number;
  lastActiveAt: number | null;
};

export type AdminStats = {
  totalUsers: number;
  activeUsersThisWeek: number;
  decisionsThisWeek: number;
  highRiskPct: number;
  weeklyTrend: { weekStart: number; count: number }[];
};

export async function getAllUsers(): Promise<AdminUser[]> {
  const allUsers = await db.select().from(users).orderBy(desc(users.createdAt));
  const now = Date.now();

  return Promise.all(
    allUsers.map(async (u) => {
      const [dc] = await db
        .select({ c: count() })
        .from(decisions)
        .where(eq(decisions.userId, u.id));
      const [hc] = await db
        .select({ c: count() })
        .from(holdings)
        .where(and(eq(holdings.userId, u.id), eq(holdings.status, "HOLDING")));
      let lastActiveAt: number | null = null;
      const [latest] = await db
        .select({ createdAt: decisions.createdAt })
        .from(decisions)
        .where(eq(decisions.userId, u.id))
        .orderBy(desc(decisions.createdAt))
        .limit(1);
      if (latest) lastActiveAt = latest.createdAt;

      return {
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        disabled: Boolean(u.disabled),
        createdAt: u.createdAt,
        passwordChangedAt: u.passwordChangedAt,
        decisionCount: dc?.c ?? 0,
        activeHoldingCount: hc?.c ?? 0,
        lastActiveAt,
      };
    })
  );
}

export async function getAdminStats(): Promise<AdminStats> {
  const now = Date.now();
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;

  // Total users
  const [totalUsersResult] = await db.select({ c: count() }).from(users);

  // Active users this week (users who created a decision in last 7 days)
  const activeUserRows = await db
    .select({ userId: decisions.userId })
    .from(decisions)
    .where(gte(decisions.createdAt, weekAgo))
    .groupBy(decisions.userId);
  const activeUsersThisWeek = activeUserRows.length;

  // Decisions this week
  const [decisionsThisWeekResult] = await db
    .select({ c: count() })
    .from(decisions)
    .where(gte(decisions.createdAt, weekAgo));

  // High risk % (decisions with non-empty dangerSignals)
  const [totalDecisionsResult] = await db.select({ c: count() }).from(decisions);
  const totalDecisions = totalDecisionsResult?.c ?? 0;
  const allDecisions = await db
    .select({ dangerSignals: decisions.dangerSignals })
    .from(decisions);
  const highRiskCount = allDecisions.filter(
    (d) => d.dangerSignals && d.dangerSignals !== "[]"
  ).length;
  const highRiskPct = totalDecisions === 0 ? 0 : Math.round((highRiskCount / totalDecisions) * 100);

  // Weekly trend: decisions per week for last 12 weeks
  const weeklyTrend: { weekStart: number; count: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const weekStart = now - i * 7 * 24 * 60 * 60 * 1000;
    const weekEnd = weekStart + 7 * 24 * 60 * 60 * 1000;
    const [result] = await db
      .select({ c: count() })
      .from(decisions)
      .where(
        and(
          gte(decisions.createdAt, weekStart),
          sql`${decisions.createdAt} < ${weekEnd}`
        )
      );
    weeklyTrend.push({ weekStart, count: result?.c ?? 0 });
  }

  return {
    totalUsers: totalUsersResult?.c ?? 0,
    activeUsersThisWeek,
    decisionsThisWeek: decisionsThisWeekResult?.c ?? 0,
    highRiskPct,
    weeklyTrend,
  };
}
