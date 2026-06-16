// T+N 收益回填：扫描 retT1/T3/T5 为 null 的候选，拉 K 线填入收益率
//
// 回填条件：候选入选日期 + N 个交易日 ≤ 今日
// 收益率：(T+N close - 入选日 close) / 入选日 close * 100 (百分比)

import { and, eq, isNull, or, lte } from "drizzle-orm";
import { db } from "@/lib/db/index";
import { screenerCandidate, screenerPoolSnapshot } from "@/lib/db/schema";
import { fetchKLineBatch, type KLineBar } from "./kline";
import { isTradingDay } from "@/lib/sentiment/trading-day";

// 给定 YYYY-MM-DD 往后偏移 N 个交易日，返回目标日期 YYYY-MM-DD
function addTradingDays(startDate: string, n: number): string {
  const d = new Date(startDate + "T00:00:00+08:00");
  let count = 0;
  while (count < n) {
    d.setDate(d.getDate() + 1);
    const dash = d.toISOString().slice(0, 10);
    const weekday = d.getDay();
    if (isTradingDay(dash, weekday)) count++;
  }
  return d.toISOString().slice(0, 10);
}

// 从 K 线序列里找到指定日期（或之后最近的）的收盘价
function findClose(bars: KLineBar[], targetDate: string): number | null {
  for (const b of bars) {
    if (b.day >= targetDate) return b.close;
  }
  return null;
}

type BackfillTarget = {
  id: string;
  symbol: string;
  market: "SH" | "SZ" | "BJ";
  tradeDate: string;
  entryPrice: number;
  needT1: boolean;
  needT3: boolean;
  needT5: boolean;
};

export type BackfillResult = {
  attempted: number;
  filled: number;
};

export async function runBackfill(todayDash: string): Promise<BackfillResult> {
  // 找所有 retT1/T3/T5 有 null 的候选（最近 15 天）
  const cutoff = addTradingDays(todayDash, -15);

  const rows = await db
    .select({
      id: screenerCandidate.id,
      symbol: screenerCandidate.symbol,
      price: screenerCandidate.price,
      snapshotId: screenerCandidate.snapshotId,
      retT1: screenerCandidate.retT1,
      retT3: screenerCandidate.retT3,
      retT5: screenerCandidate.retT5,
    })
    .from(screenerCandidate)
    .where(
      and(
        or(
          isNull(screenerCandidate.retT1),
          isNull(screenerCandidate.retT3),
          isNull(screenerCandidate.retT5)
        )
      )
    );

  if (rows.length === 0) return { attempted: 0, filled: 0 };

  // 拿每个 candidate 对应 snapshot 的 tradeDate
  const snapshotIds = [...new Set(rows.map((r) => r.snapshotId))];
  const snapshots = await db
    .select({ id: screenerPoolSnapshot.id, tradeDate: screenerPoolSnapshot.tradeDate })
    .from(screenerPoolSnapshot)
    .where(
      or(...snapshotIds.map((sid) => eq(screenerPoolSnapshot.id, sid)))
    );
  const snapDateMap = new Map(snapshots.map((s) => [s.id, s.tradeDate]));

  // 过滤：只处理 tradeDate >= cutoff 的
  const targets: BackfillTarget[] = [];
  for (const r of rows) {
    const tradeDate = snapDateMap.get(r.snapshotId);
    if (!tradeDate || tradeDate < cutoff) continue;

    const t1Date = addTradingDays(tradeDate, 1);
    const t3Date = addTradingDays(tradeDate, 3);
    const t5Date = addTradingDays(tradeDate, 5);

    const needT1 = r.retT1 == null && t1Date <= todayDash;
    const needT3 = r.retT3 == null && t3Date <= todayDash;
    const needT5 = r.retT5 == null && t5Date <= todayDash;

    if (!needT1 && !needT3 && !needT5) continue;

    const market = marketFromSymbol(r.symbol);
    targets.push({
      id: r.id,
      symbol: r.symbol,
      market,
      tradeDate,
      entryPrice: r.price,
      needT1,
      needT3,
      needT5,
    });
  }

  if (targets.length === 0) return { attempted: 0, filled: 0 };

  // 去重 symbol 拉 K 线
  const uniqueSymbols = [...new Set(targets.map((t) => t.symbol))];
  const klineMap = await fetchKLineBatch(
    uniqueSymbols.map((s) => ({
      code: s,
      market: targets.find((t) => t.symbol === s)!.market,
    })),
    30,
    8
  );

  let filled = 0;
  for (const t of targets) {
    const bars = klineMap.get(t.symbol);
    if (!bars || bars.length === 0) continue;

    const updates: Record<string, number | null> = {};
    if (t.needT1) {
      const targetDate = addTradingDays(t.tradeDate, 1);
      const close = findClose(bars, targetDate);
      if (close != null) {
        updates.retT1 = ((close - t.entryPrice) / t.entryPrice) * 100;
      }
    }
    if (t.needT3) {
      const targetDate = addTradingDays(t.tradeDate, 3);
      const close = findClose(bars, targetDate);
      if (close != null) {
        updates.retT3 = ((close - t.entryPrice) / t.entryPrice) * 100;
      }
    }
    if (t.needT5) {
      const targetDate = addTradingDays(t.tradeDate, 5);
      const close = findClose(bars, targetDate);
      if (close != null) {
        updates.retT5 = ((close - t.entryPrice) / t.entryPrice) * 100;
      }
    }

    if (Object.keys(updates).length > 0) {
      await db
        .update(screenerCandidate)
        .set({ ...updates, filledAt: Date.now() })
        .where(eq(screenerCandidate.id, t.id));
      filled++;
    }
  }

  return { attempted: targets.length, filled };
}

function marketFromSymbol(code: string): "SH" | "SZ" | "BJ" {
  if (code.startsWith("6")) return "SH";
  if (code.startsWith("0") || code.startsWith("3")) return "SZ";
  return "BJ";
}
