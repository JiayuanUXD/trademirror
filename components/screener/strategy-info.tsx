"use client";

import { Info } from "lucide-react";
import { useState } from "react";

export type FunnelSummary = {
  universe: number;
  afterPriceRange: number;
  afterStFilter: number;
  afterNewFilter: number;
  afterTurnoverYi: number;
  afterTurnoverRate: number;
  afterTechnicalProbe?: number;
  afterTrendFilter?: number;
  afterGate: number;
};

export function StrategyInfo({ funnel }: { funnel?: FunnelSummary | null }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setOpen(false)}
        aria-label="过滤漏斗详情"
        className="inline-flex items-center justify-center w-5 h-5 rounded-full transition-colors"
        style={{ color: "var(--muted-foreground)" }}
      >
        <Info size={14} />
      </button>

      {open && (
        <div
          role="dialog"
          onMouseDown={(e) => e.preventDefault()}
          className="absolute left-0 top-7 z-30 w-72 md:w-80 rounded-xl border p-4 text-xs shadow-lg"
          style={{
            backgroundColor: "var(--surface-overlay)",
            borderColor: "var(--border-subtle)",
            color: "var(--foreground)",
          }}
        >
          {funnel ? (
            <div className="space-y-1.5">
              <p className="font-medium mb-2" style={{ color: "var(--muted-foreground)" }}>过滤漏斗</p>
              <FunnelStep label="全市场" value={funnel.universe} />
              <FunnelStep label="价格区间" value={funnel.afterPriceRange} prev={funnel.universe} />
              <FunnelStep label="剔除 ST" value={funnel.afterStFilter} prev={funnel.afterPriceRange} />
              <FunnelStep label="剔除新股" value={funnel.afterNewFilter} prev={funnel.afterStFilter} />
              <FunnelStep label="成交额达标" value={funnel.afterTurnoverYi} prev={funnel.afterNewFilter} />
              <FunnelStep label="换手率达标" value={funnel.afterTurnoverRate} prev={funnel.afterTurnoverYi} />
              <FunnelStep label="进入日K体检" value={funnel.afterTechnicalProbe} prev={funnel.afterTurnoverRate} />
              <FunnelStep
                label="趋势未走坏"
                value={funnel.afterTrendFilter}
                prev={funnel.afterTechnicalProbe ?? funnel.afterTurnoverRate}
              />
              <FunnelStep
                label="闸门取顶"
                value={funnel.afterGate}
                prev={funnel.afterTrendFilter ?? funnel.afterTechnicalProbe ?? funnel.afterTurnoverRate}
              />
            </div>
          ) : (
            <p style={{ color: "var(--muted-foreground)" }}>
              尚未扫描，运行一次后可查看过滤漏斗。
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function FunnelStep({ label, value, prev }: { label: string; value: number | undefined; prev?: number }) {
  if (value == null) return null;
  const diff = prev != null ? prev - value : null;
  return (
    <div className="flex items-center justify-between">
      <span style={{ color: "var(--muted-foreground)" }}>{label}</span>
      <span className="tabular-nums" style={{ color: "var(--foreground)" }}>
        {value.toLocaleString()}
        {diff != null && diff > 0 && (
          <span className="ml-2 text-[10px]" style={{ color: "var(--muted-foreground)" }}>
            (-{diff.toLocaleString()})
          </span>
        )}
      </span>
    </div>
  );
}
