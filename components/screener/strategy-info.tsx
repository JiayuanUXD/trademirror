"use client";

import { Info } from "lucide-react";
import { useState } from "react";

export function StrategyInfo() {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setOpen(false)}
        aria-label="选股策略说明"
        className="inline-flex items-center justify-center w-5 h-5 rounded-full transition-colors"
        style={{ color: "var(--muted-foreground)" }}
      >
        <Info size={14} />
      </button>

      {open && (
        <div
          role="dialog"
          className="absolute left-0 top-7 z-30 w-80 md:w-96 rounded-xl border p-4 text-xs space-y-3 shadow-lg"
          style={{
            backgroundColor: "var(--surface-overlay)",
            borderColor: "var(--border-subtle)",
            color: "var(--foreground)",
          }}
        >
          <div>
            <p className="font-medium mb-1">第 0 层 · 闸门联动</p>
            <p style={{ color: "var(--muted-foreground)" }}>
              按当日情绪阶段决定入池上限：冰点 / 退潮 ≤3 只，修复 ≤5 只，发酵 ≤6 只，主升 ≤8 只。错环境直接收紧，不诱导开仓。
            </p>
          </div>

          <div>
            <p className="font-medium mb-1">第 1 层 · 流动性过滤</p>
            <p style={{ color: "var(--muted-foreground)" }}>
              成交额 ≥ 1 亿、换手率 3%~25%、价格 3~200 元；剔除 ST / 退市 / 新股次新。门槛在「设置 · 选股漏斗」可改。
            </p>
          </div>

          <div>
            <p className="font-medium mb-1">第 2 层 · 技术拒马</p>
            <p style={{ color: "var(--muted-foreground)" }}>
              拉前 60 只做日 K 体检：今日收盘跌破 MA10、或 MA5 死叉 MA10 → 直接出局。趋势不友好就别上车。
            </p>
          </div>

          <div>
            <p className="font-medium mb-1">第 3 层 · 突破信号打分</p>
            <p style={{ color: "var(--muted-foreground)" }}>
              量比 ≥ 2 +0.2、平台突破（10 日箱体 + 突破前高）+0.3、20 日新高 +0.2。综合分降序排，闸门取顶。
            </p>
          </div>

          <div
            className="pt-2 border-t text-[11px]"
            style={{ borderColor: "var(--border-subtle)", color: "var(--muted-foreground)" }}
          >
            这只是流动性筛子，不是买入信号。具体下单还是要走决策卡。
          </div>
        </div>
      )}
    </div>
  );
}
