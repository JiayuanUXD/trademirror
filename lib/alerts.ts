/**
 * 智能预警计算模块
 *
 * 纯服务端：基于 decisions + holdings 数据推导预警，不需要额外的 DB 表。
 * 所有函数可以直接在 Server Component 中调用。
 */

import type { Decision } from "@/types/decision";
import type { Holding } from "@/types/holding";
import { IRRATIONAL_BASIS } from "@/types/decision";

// ─── 类型 ─────────────────────────────────────────────────────────────────────

export type AlertSeverity = "HIGH" | "MEDIUM" | "LOW";
export type AlertCategory = "BEHAVIOR" | "POSITION" | "GOAL";

export type Alert = {
  id: string;
  category: AlertCategory;
  severity: AlertSeverity;
  title: string;
  detail: string;
  /** 点击后跳转的路径 */
  link?: string;
};

// ─── 辅助 ─────────────────────────────────────────────────────────────────────

/** 过去 N 天的决策（createdAt 降序，已保证） */
function recentDecisions(decisions: Decision[], days: number): Decision[] {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return decisions.filter((d) => d.createdAt >= cutoff);
}

const irrationalBasisSet = new Set<string>(IRRATIONAL_BASIS);

/** 判断一笔决策是否属于非理性 */
function isIrrational(d: Decision): boolean {
  return (
    d.fomoScore >= 7 ||
    d.systemAlignment === "NOT_ALIGN" ||
    d.basis.some((b) => irrationalBasisSet.has(b))
  );
}

// ─── 行为预警 ─────────────────────────────────────────────────────────────────

/**
 * 连续 2 笔 FOMO ≥ 7——情绪波动预警（PRD 3.7.1）
 * 同时附上用户自己的历史 FOMO≥7 胜率数据。
 */
function checkEmotionalStreak(decisions: Decision[]): Alert | null {
  const last2 = decisions.slice(0, 2);
  if (last2.length < 2) return null;
  if (!last2.every((d) => d.fomoScore >= 7)) return null;

  const avgFomo = last2.reduce((s, d) => s + d.fomoScore, 0) / last2.length;

  // 历史数据：FOMO≥7 且有结果的操作
  const fomoHighWithResult = decisions.filter(
    (d) => d.fomoScore >= 7 && d.return30Days !== null
  );
  let historicalSuffix = "";
  if (fomoHighWithResult.length >= 3) {
    const lossCount = fomoHighWithResult.filter(
      (d) => (d.return30Days ?? 0) < 0
    ).length;
    const lossPct = Math.round((lossCount / fomoHighWithResult.length) * 100);
    historicalSuffix = ` 历史数据：你 FOMO≥7 的 ${fomoHighWithResult.length} 笔中，${lossCount} 笔亏损（${lossPct}%）。`;
  }

  return {
    id: "behavior_emotional_streak",
    category: "BEHAVIOR",
    severity: "HIGH",
    title: "近期 FOMO 持续偏高",
    detail: `最近 2 笔交易 FOMO 均 ≥ 7（平均 ${avgFomo.toFixed(1)} 分）。建议暂停交易 24 小时，冷静复盘。${historicalSuffix}`,
    link: "/decisions",
  };
}

/**
 * 过去 7 天交易次数超过 3 次——频繁交易预警（PRD 3.7.1）
 */
function checkFrequentTrading(decisions: Decision[]): Alert | null {
  const recent = recentDecisions(decisions, 7);
  if (recent.length <= 3) return null;
  return {
    id: "behavior_frequent_trading",
    category: "BEHAVIOR",
    severity: "HIGH",
    title: "本周操作过于频繁",
    detail: `过去 7 天已操作 ${recent.length} 次，超过建议上限 3 次。频繁交易是历史亏损的主要模式之一。`,
    link: "/decisions",
  };
}

/**
 * 近期（最多 10 笔）非理性决策依据占比 > 50%——非理性主导预警
 */
function checkIrrationalDominance(decisions: Decision[]): Alert | null {
  const sample = decisions.slice(0, 10);
  if (sample.length < 3) return null;

  const irrationalCount = sample.filter((d) =>
    d.basis.some((b) => irrationalBasisSet.has(b))
  ).length;
  const ratio = irrationalCount / sample.length;
  if (ratio <= 0.5) return null;

  return {
    id: "behavior_irrational_dominance",
    category: "BEHAVIOR",
    severity: "MEDIUM",
    title: "近期非理性决策依据偏多",
    detail: `最近 ${sample.length} 笔中，${irrationalCount} 笔包含"凭感觉/跟风/情绪驱动"等非理性依据（占比 ${Math.round(ratio * 100)}%）。`,
    link: "/analytics",
  };
}

/**
 * 连续 3 笔或以上有结果的交易全部亏损——连续亏损预警
 * 附上历史总亏损笔数作为背景。
 */
function checkConsecutiveLosses(decisions: Decision[]): Alert | null {
  const withResult = decisions.filter((d) => d.return30Days !== null);
  if (withResult.length < 3) return null;

  let streak = 0;
  for (const d of withResult) {
    if ((d.return30Days ?? 0) < 0) streak++;
    else break;
  }

  if (streak < 3) return null;

  const totalLossCount = withResult.filter(
    (d) => (d.return30Days ?? 0) < 0
  ).length;
  const lossRate = Math.round((totalLossCount / withResult.length) * 100);

  return {
    id: "behavior_consecutive_losses",
    category: "BEHAVIOR",
    severity: "HIGH",
    title: `已连续 ${streak} 笔亏损`,
    detail: `最近 ${streak} 笔有结果的交易均为亏损。你全部有结果的操作中亏损占 ${lossRate}%（${totalLossCount}/${withResult.length} 笔）。建议先复盘再考虑新操作。`,
    link: "/decisions",
  };
}

/**
 * 过去 30 天中出现"不符合体系"决策 ≥ 3 次——纪律松弛预警
 */
function checkSystemViolations(decisions: Decision[]): Alert | null {
  const recent = recentDecisions(decisions, 30);
  const violations = recent.filter((d) => d.systemAlignment === "NOT_ALIGN");
  if (violations.length < 3) return null;

  return {
    id: "behavior_system_violations",
    category: "BEHAVIOR",
    severity: "MEDIUM",
    title: "本月多次突破自己的交易体系",
    detail: `过去 30 天中有 ${violations.length} 笔交易标注为"不符合体系"。纪律松弛往往是亏损加速的前兆。`,
    link: "/reviews",
  };
}

/**
 * 个性化反熵提醒（PRD 3.7.2）
 * 分析非理性决策的时间分布，找出高危时间段（3小时粒度）。
 * 需要 ≥10 笔决策、≥4 笔非理性决策，且某时段占比 ≥35%。
 */
function checkTimePattern(decisions: Decision[]): Alert | null {
  if (decisions.length < 10) return null;

  const irrational = decisions.filter(isIrrational);
  if (irrational.length < 4) return null;

  // 按 3 小时粒度分桶
  const buckets: Record<number, number> = {};
  for (const d of irrational) {
    const hour = new Date(d.createdAt).getHours();
    const bucket = Math.floor(hour / 3) * 3; // 0, 3, 6, 9, 12, 15, 18, 21
    buckets[bucket] = (buckets[bucket] ?? 0) + 1;
  }

  // 找峰值桶
  let peakBucket = -1;
  let peakCount = 0;
  for (const [b, count] of Object.entries(buckets)) {
    if (count > peakCount) {
      peakCount = count;
      peakBucket = Number(b);
    }
  }

  const peakRatio = peakCount / irrational.length;
  if (peakRatio < 0.35 || peakCount < 3) return null;

  const startH = peakBucket;
  const endH = peakBucket + 3;

  return {
    id: "behavior_time_pattern",
    category: "BEHAVIOR",
    severity: "LOW",
    title: `个性化提醒：${startH}:00–${endH}:00 是你的高危时段`,
    detail: `你的非理性决策中，${Math.round(peakRatio * 100)}% 发生在 ${startH}:00–${endH}:00（${peakCount}/${irrational.length} 笔）。这段时间建议先做计划，而不是直接操作。`,
    link: "/analytics",
  };
}

// ─── 持仓预警 ─────────────────────────────────────────────────────────────────

/**
 * 计算账户总市值（仅 HOLDING 状态）
 */
function totalPortfolioValue(holdings: Holding[]): number {
  return holdings
    .filter((h) => h.status === "HOLDING")
    .reduce((sum, h) => {
      const price = h.currentPrice ?? h.costPrice;
      return sum + price * h.shares;
    }, 0);
}

/**
 * 浮盈 / 浮亏预警（PRD 3.7.1）
 * 需要 currentPrice 有值才能计算。
 */
function checkHoldingPnL(holdings: Holding[]): Alert[] {
  const alerts: Alert[] = [];
  for (const h of holdings) {
    if (
      h.status !== "HOLDING" ||
      !h.currentPrice ||
      !h.costPrice ||
      h.shares <= 0
    )
      continue;

    const pnlPct = ((h.currentPrice - h.costPrice) / h.costPrice) * 100;

    if (pnlPct >= 100) {
      alerts.push({
        id: `position_pnl_profit_high_${h.id}`,
        category: "POSITION",
        severity: "HIGH",
        title: `${h.stockName} 浮盈超过 100%`,
        detail: `${h.stockName}（${h.stockCode}）当前浮盈 ${pnlPct.toFixed(1)}%。高浮盈回撤风险大，请检查止盈计划是否需要执行。`,
        link: `/holdings/${h.id}`,
      });
    } else if (pnlPct >= 50) {
      alerts.push({
        id: `position_pnl_profit_med_${h.id}`,
        category: "POSITION",
        severity: "MEDIUM",
        title: `${h.stockName} 浮盈超过 50%`,
        detail: `${h.stockName}（${h.stockCode}）当前浮盈 ${pnlPct.toFixed(1)}%。可以考虑分批止盈，锁定部分收益。`,
        link: `/holdings/${h.id}`,
      });
    } else if (pnlPct <= -20) {
      alerts.push({
        id: `position_pnl_loss_high_${h.id}`,
        category: "POSITION",
        severity: "HIGH",
        title: `${h.stockName} 浮亏超过 20%`,
        detail: `${h.stockName}（${h.stockCode}）当前浮亏 ${Math.abs(pnlPct).toFixed(1)}%。请检查撤退条件，避免"越跌越补"扩大亏损。`,
        link: `/holdings/${h.id}`,
      });
    } else if (pnlPct <= -10) {
      alerts.push({
        id: `position_pnl_loss_med_${h.id}`,
        category: "POSITION",
        severity: "MEDIUM",
        title: `${h.stockName} 浮亏超过 10%`,
        detail: `${h.stockName}（${h.stockCode}）当前浮亏 ${Math.abs(pnlPct).toFixed(1)}%。撤退条件是否需要复核？`,
        link: `/holdings/${h.id}`,
      });
    }
  }
  return alerts;
}

/**
 * 单只持仓仓位超过 25%——集中度预警（PRD 3.7.1）
 */
function checkConcentration(holdings: Holding[]): Alert[] {
  const total = totalPortfolioValue(holdings);
  if (total <= 0) return [];

  const alerts: Alert[] = [];
  const active = holdings.filter((h) => h.status === "HOLDING");

  for (const h of active) {
    const price = h.currentPrice ?? h.costPrice;
    const weight = (price * h.shares) / total;
    if (weight > 0.4) {
      alerts.push({
        id: `position_concentration_${h.id}`,
        category: "POSITION",
        severity: "HIGH",
        title: `${h.stockName} 仓位严重过重`,
        detail: `${h.stockName}（${h.stockCode}）占总持仓 ${Math.round(weight * 100)}%，已超过危险阈值 40%。`,
        link: `/holdings/${h.id}`,
      });
    } else if (weight > 0.25) {
      alerts.push({
        id: `position_concentration_${h.id}`,
        category: "POSITION",
        severity: "MEDIUM",
        title: `${h.stockName} 仓位超出纪律上限`,
        detail: `${h.stockName}（${h.stockCode}）占总持仓 ${Math.round(weight * 100)}%，超过自设上限 25%。`,
        link: `/holdings/${h.id}`,
      });
    }
  }
  return alerts;
}

/**
 * 持仓股没有设置任何撤退条件——无止损预警
 */
function checkNoExitConditions(holdings: Holding[]): Alert[] {
  return holdings
    .filter((h) => h.status === "HOLDING" && h.exitConditions.length === 0)
    .map((h) => ({
      id: `position_no_exit_${h.id}`,
      category: "POSITION" as AlertCategory,
      severity: "LOW" as AlertSeverity,
      title: `${h.stockName} 未设置撤退条件`,
      detail: `${h.stockName}（${h.stockCode}）没有任何撤退条件。没有计划的持仓容易在下跌时犹豫不决。`,
      link: `/holdings/${h.id}`,
    }));
}

/**
 * 当前价格低于止损价——止损位跌破预警
 */
function checkStopLossBreach(holdings: Holding[]): Alert[] {
  const alerts: Alert[] = [];
  for (const h of holdings) {
    if (h.status !== "HOLDING" || !h.currentPrice) continue;

    const stopCondition = h.exitConditions.find(
      (c) => c.type === "PRICE_BELOW" && c.threshold != null
    );
    if (!stopCondition?.threshold) continue;

    if (h.currentPrice < stopCondition.threshold) {
      const drawdown =
        ((h.currentPrice - stopCondition.threshold) / stopCondition.threshold) * 100;
      alerts.push({
        id: `position_stop_breach_${h.id}`,
        category: "POSITION",
        severity: "HIGH",
        title: `${h.stockName} 已跌破止损价`,
        detail: `${h.stockName} 当前价 ¥${h.currentPrice} 低于止损价 ¥${stopCondition.threshold}（偏离 ${Math.abs(drawdown).toFixed(1)}%）。撤退计划：${stopCondition.description}`,
        link: `/holdings/${h.id}`,
      });
    }
  }
  return alerts;
}

/**
 * 撤退条件已被手动触发但持仓仍在——触发条件未执行预警
 */
function checkTriggeredExitConditions(holdings: Holding[]): Alert[] {
  const alerts: Alert[] = [];
  for (const h of holdings) {
    if (h.status !== "HOLDING") continue;
    const triggered = h.exitConditions.filter((c) => c.triggered);
    if (triggered.length > 0) {
      alerts.push({
        id: `position_triggered_exit_${h.id}`,
        category: "POSITION",
        severity: "HIGH",
        title: `${h.stockName} 撤退条件已触发`,
        detail: `${triggered.length} 个撤退条件已标记触发：${triggered.map((c) => c.description).join("；")}。`,
        link: `/holdings/${h.id}`,
      });
    }
  }
  return alerts;
}

// ─── 主入口 ───────────────────────────────────────────────────────────────────

/**
 * 计算所有当前预警，返回按严重程度排序的列表。
 * severity: HIGH → MEDIUM → LOW
 */
export function computeAlerts(
  decisions: Decision[],
  holdings: Holding[]
): Alert[] {
  const behaviorAlerts: (Alert | null)[] = [
    checkEmotionalStreak(decisions),
    checkFrequentTrading(decisions),
    checkConsecutiveLosses(decisions),
    checkSystemViolations(decisions),
    checkIrrationalDominance(decisions),
    checkTimePattern(decisions),
  ];

  const positionAlerts: Alert[] = [
    ...checkStopLossBreach(holdings),
    ...checkTriggeredExitConditions(holdings),
    ...checkHoldingPnL(holdings),
    ...checkConcentration(holdings),
    ...checkNoExitConditions(holdings),
  ];

  const all: Alert[] = [
    ...behaviorAlerts.filter((a): a is Alert => a !== null),
    ...positionAlerts,
  ];

  const order: Record<AlertSeverity, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };
  return all.sort((a, b) => order[a.severity] - order[b.severity]);
}
