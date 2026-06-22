"use client";

import { useState } from "react";
import type { SnapshotWithCandidates } from "@/lib/db/queries/screener";
import { PoolCard } from "./pool-card";
import { StrategyInfo, type FunnelSummary } from "./strategy-info";

function parseInitialFunnel(initial: SnapshotWithCandidates | null): FunnelSummary | null {
  if (!initial) return null;
  try {
    return JSON.parse(initial.snapshot.filteredSummary);
  } catch {
    return null;
  }
}

export function ScreenerHeader({ initial }: { initial: SnapshotWithCandidates | null }) {
  const [funnel, setFunnel] = useState<FunnelSummary | null>(() => parseInitialFunnel(initial));

  return (
    <>
      <header>
        <div className="flex items-center gap-2">
          <h1 className="text-xl md:text-2xl font-semibold" style={{ color: "var(--foreground)" }}>
            选股漏斗
          </h1>
          <StrategyInfo funnel={funnel} />
        </div>
        <p className="text-xs md:text-sm mt-1" style={{ color: "var(--muted-foreground)" }}>
          盘后 15:35 自动扫全市场，按情绪阶段闸门 + 流动性 + 技术指标过滤后留下 ≤8 只。这是一面筛子，不是荐股。
        </p>
      </header>

      <PoolCard initial={initial} onFunnelChange={setFunnel} />
    </>
  );
}
