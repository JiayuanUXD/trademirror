"use client";

import { useState, useCallback } from "react";
import { ShoppingCart, DollarSign, TrendingDown } from "lucide-react";
import type { Holding } from "@/types/holding";
import { STATUS_LABELS, STATUS_COLORS } from "@/types/holding";
import { useStockPrices } from "@/lib/use-stock-prices";
import { DecisionDrawer, DECISION_DRAWER_CLOSED, type DecisionDrawerState } from "./decision-drawer";
import type { DecisionAction } from "@/types/decision";

function healthColor(score: number): string {
  if (score >= 60) return "var(--brand-green)";
  if (score >= 30) return "var(--brand-warning)";
  return "var(--brand-red)";
}

type Props = {
  holding: Holding;
  decisionCount: number;
};

export function HoldingDetailHeader({ holding, decisionCount }: Props) {
  const prices = useStockPrices(
    holding.shares > 0
      ? [{ stockCode: holding.stockCode, stockMarket: holding.stockMarket }]
      : []
  );

  const [drawer, setDrawer] = useState<DecisionDrawerState>(DECISION_DRAWER_CLOSED);

  const openDrawer = useCallback((action: DecisionAction) => {
    setDrawer({
      open: true,
      stockCode: holding.stockCode,
      stockName: holding.stockName,
      stockMarket: holding.stockMarket,
      action,
    });
  }, [holding]);

  const closeDrawer = useCallback(() => {
    setDrawer(DECISION_DRAWER_CLOSED);
  }, []);

  const currentPrice = prices.get(holding.stockCode) ?? holding.currentPrice;
  const pnlPct = currentPrice && holding.costPrice
    ? ((currentPrice - holding.costPrice) / holding.costPrice) * 100
    : null;
  const pnlAmt = currentPrice && holding.costPrice && holding.shares > 0
    ? (currentPrice - holding.costPrice) * holding.shares
    : null;
  const marketValue = (currentPrice ?? holding.costPrice) * holding.shares;

  // Holding days
  const days = holding.firstBuyAt
    ? Math.floor((Date.now() - holding.firstBuyAt) / 86_400_000)
    : null;

  const isHolding = holding.status === "HOLDING";
  const btnBase = "inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium transition-opacity hover:opacity-80 cursor-pointer";

  return (
    <>
      <div
        className="rounded-xl border p-5"
        style={{ backgroundColor: "var(--surface-card)", borderColor: "var(--border-subtle)" }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-bold" style={{ color: "var(--foreground)" }}>
                {holding.stockName}
              </h1>
              <span className="text-sm" style={{ color: "var(--muted-foreground)" }}>
                {holding.stockCode} · {holding.stockMarket}
              </span>
              {holding.sector && (
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded"
                  style={{ backgroundColor: "var(--surface-overlay)", color: "var(--muted-foreground)" }}
                >
                  {holding.sector}
                </span>
              )}
              {days !== null && (
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded tabular-nums"
                  style={{ backgroundColor: "var(--surface-overlay)", color: "var(--muted-foreground)" }}
                >
                  持仓 {days} 天
                </span>
              )}
            </div>

            <div className="flex items-center gap-4 mt-2 text-sm" style={{ color: "var(--muted-foreground)" }}>
              <span>成本 ¥{holding.costPrice.toLocaleString()}</span>
              {currentPrice && (
                <span>
                  现价 <span style={{ color: "var(--foreground)", fontWeight: 600 }}>¥{currentPrice.toLocaleString()}</span>
                </span>
              )}
              <span>{holding.shares.toLocaleString()} 股</span>
              <span>¥{(marketValue / 10000).toFixed(1)} 万</span>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <span
              className="text-xs font-medium px-2 py-0.5 rounded-full"
              style={{ color: STATUS_COLORS[holding.status], backgroundColor: `${STATUS_COLORS[holding.status]}22` }}
            >
              {STATUS_LABELS[holding.status]}
            </span>
            {pnlPct !== null && (
              <div className="text-right">
                <span
                  className="text-base font-bold tabular-nums"
                  style={{ color: pnlPct >= 0 ? "var(--color-up)" : "var(--color-down)" }}
                >
                  {pnlPct >= 0 ? "+" : ""}{pnlPct.toFixed(2)}%
                </span>
                {pnlAmt !== null && (
                  <div
                    className="text-xs tabular-nums"
                    style={{ color: pnlAmt >= 0 ? "var(--color-up)" : "var(--color-down)" }}
                  >
                    {pnlAmt >= 0 ? "+" : ""}¥{Math.abs(pnlAmt) >= 10000
                      ? `${(pnlAmt / 10000).toFixed(2)}万`
                      : pnlAmt.toFixed(0)}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Action buttons */}
        {isHolding && (
          <div className="flex items-center gap-2 mt-3" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => openDrawer("ADD")}
              className={btnBase}
              style={{ backgroundColor: "rgba(var(--color-up-rgb, 239,68,68),0.08)", color: "var(--color-up)", border: "1px solid rgba(var(--color-up-rgb,239,68,68),0.2)" }}
            >
              <ShoppingCart size={12} /> 加仓
            </button>
            <button
              type="button"
              onClick={() => openDrawer("SELL")}
              className={btnBase}
              style={{ backgroundColor: "rgba(var(--color-down-rgb, 22,163,74),0.08)", color: "var(--color-down)", border: "1px solid rgba(var(--color-down-rgb,22,163,74),0.2)" }}
            >
              <DollarSign size={12} /> 卖出
            </button>
            <button
              type="button"
              onClick={() => openDrawer("REDUCE")}
              className={btnBase}
              style={{ backgroundColor: "var(--surface-overlay)", color: "var(--muted-foreground)", border: "1px solid var(--border-subtle)" }}
            >
              <TrendingDown size={12} /> 减仓
            </button>
          </div>
        )}

        {/* Health score */}
        <div className="mt-4 space-y-1">
          <div className="flex items-center justify-between text-xs" style={{ color: "var(--muted-foreground)" }}>
            <span>档案健康度</span>
            <span style={{ color: healthColor(holding.healthScore) }}>
              {holding.healthScore}/100
            </span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: "var(--surface-overlay)" }}>
            <div
              className="h-full rounded-full"
              style={{
                width: `${holding.healthScore}%`,
                backgroundColor: healthColor(holding.healthScore),
              }}
            />
          </div>
          <div className="flex gap-4 text-[11px]" style={{ color: "var(--muted-foreground)" }}>
            <span>逻辑 {holding.logic.reasons.length} 条</span>
            <span>前提 {holding.prerequisites.length} 项</span>
            <span>撤退 {holding.exitConditions.length} 项</span>
            <span>操作 {decisionCount} 笔</span>
          </div>
        </div>
      </div>

      {/* 决策卡抽屉 */}
      <DecisionDrawer state={drawer} onClose={closeDrawer} />
    </>
  );
}
