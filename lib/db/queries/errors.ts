import { db } from "../index";
import { errorTypes, errorLogs } from "../schema";
import { and, eq, desc, gte, lt, or } from "drizzle-orm";
import { randomUUID } from "crypto";

export type ErrorType = {
  id: string;
  name: string;
  description: string;
  isPreset: boolean;
  createdAt: number;
};

export type ErrorLog = {
  id: string;
  errorTypeId: string;
  decisionId: string | null;
  note: string;
  cost: number | null;
  occurredAt: number;
};

export type ErrorTypeWithStats = ErrorType & {
  occurrences: number;
  totalCost: number | null;
  lastOccurredAt: number | null;
  trend: "INCREASING" | "STABLE" | "DECREASING";
};

function computeTrend(
  logs: { occurredAt: number }[],
  now: number
): "INCREASING" | "STABLE" | "DECREASING" {
  const t30 = now - 30 * 24 * 60 * 60 * 1000;
  const t60 = now - 60 * 24 * 60 * 60 * 1000;
  const recent = logs.filter((l) => l.occurredAt >= t30).length;
  const past = logs.filter((l) => l.occurredAt >= t60 && l.occurredAt < t30).length;
  if (recent > past + 1) return "INCREASING";
  if (recent < past - 1) return "DECREASING";
  return "STABLE";
}

export async function getErrorTypes(userId: string): Promise<ErrorTypeWithStats[]> {
  const types = await db
    .select()
    .from(errorTypes)
    .where(or(eq(errorTypes.userId, userId), eq(errorTypes.isPreset, true)))
    .orderBy(errorTypes.createdAt);

  const logs = await db
    .select()
    .from(errorLogs)
    .where(eq(errorLogs.userId, userId))
    .orderBy(desc(errorLogs.occurredAt));
  const now = Date.now();

  return types.map((t) => {
    const tLogs = logs.filter((l) => l.errorTypeId === t.id);
    const costs = tLogs.filter((l) => l.cost !== null).map((l) => l.cost as number);
    const totalCost = costs.length > 0 ? costs.reduce((a, b) => a + b, 0) : null;

    return {
      ...t,
      occurrences: tLogs.length,
      totalCost,
      lastOccurredAt: tLogs.length > 0 ? tLogs[0].occurredAt : null,
      trend: computeTrend(tLogs, now),
    };
  });
}

export async function getErrorLogsByDecision(decisionId: string, userId: string): Promise<(ErrorLog & { errorTypeName: string })[]> {
  const rows = await db
    .select({
      id: errorLogs.id,
      errorTypeId: errorLogs.errorTypeId,
      errorTypeName: errorTypes.name,
      decisionId: errorLogs.decisionId,
      note: errorLogs.note,
      cost: errorLogs.cost,
      occurredAt: errorLogs.occurredAt,
    })
    .from(errorLogs)
    .leftJoin(errorTypes, eq(errorLogs.errorTypeId, errorTypes.id))
    .where(and(eq(errorLogs.decisionId, decisionId), eq(errorLogs.userId, userId)));

  return rows.map((r) => ({ ...r, errorTypeName: r.errorTypeName ?? "未知" }));
}

export async function getErrorLogsByType(errorTypeId: string, userId: string): Promise<ErrorLog[]> {
  return db
    .select()
    .from(errorLogs)
    .where(and(eq(errorLogs.errorTypeId, errorTypeId), eq(errorLogs.userId, userId)))
    .orderBy(desc(errorLogs.occurredAt));
}

export async function createErrorType(
  name: string,
  description: string,
  userId: string
): Promise<ErrorType> {
  const row = {
    id: randomUUID(),
    userId,
    name,
    description,
    isPreset: false,
    createdAt: Date.now(),
  };
  await db.insert(errorTypes).values(row);
  return row;
}

export async function addErrorLog(
  payload: {
    errorTypeId: string;
    decisionId?: string;
    note?: string;
    cost?: number | null;
  },
  userId: string
): Promise<ErrorLog> {
  const row: ErrorLog = {
    id: randomUUID(),
    errorTypeId: payload.errorTypeId,
    decisionId: payload.decisionId ?? null,
    note: payload.note ?? "",
    cost: payload.cost ?? null,
    occurredAt: Date.now(),
  };
  await db.insert(errorLogs).values({ ...row, userId });
  return row;
}

export async function deleteErrorLog(logId: string, userId: string): Promise<void> {
  await db.delete(errorLogs).where(and(eq(errorLogs.id, logId), eq(errorLogs.userId, userId)));
}
