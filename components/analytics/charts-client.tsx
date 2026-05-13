"use client";

import { useEffect, useRef, useState } from "react";
import {
  BasisChart,
  FomoChart,
  DangerChart,
  ActionPie,
  WeeklyTrendChart,
  DisciplineChart,
  FomoScatterChart,
} from "@/components/analytics/charts";
import type {
  BasisBreakdownItem,
  FomoDistItem,
  DangerBreakdownItem,
  ActionBreakdownItem,
  WeeklyTrendItem,
  DisciplineTrendItem,
  FomoVsReturnItem,
} from "@/lib/analytics";

function useSuppressRechartsInitWarning() {
  const cleanupRef = useRef<(() => void) | null>(null);
  useEffect(() => {
    const original = console.warn;
    const patched = (...args: unknown[]) => {
      const msg = typeof args[0] === "string" ? args[0] : "";
      if (msg.includes("width(-1) and height(-1)")) return;
      original.apply(console, args);
    };
    console.warn = patched;
    cleanupRef.current = () => { console.warn = original; };
    // Clean up after 200ms, long after ResizeObserver fires with real dimensions
    const timer = setTimeout(() => {
      console.warn = original;
      cleanupRef.current = null;
    }, 200);
    return () => {
      clearTimeout(timer);
      if (cleanupRef.current) cleanupRef.current();
    };
  }, []);
}

function ChartCard({
  title,
  hint,
  height = 220,
  children,
}: {
  title: string;
  hint?: string;
  height?: number;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-xl border p-4"
      style={{ backgroundColor: "var(--surface-card)", borderColor: "var(--border-subtle)" }}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium" style={{ color: "var(--foreground)" }}>{title}</h3>
        {hint && <span className="text-[11px]" style={{ color: "var(--muted-foreground)" }}>{hint}</span>}
      </div>
      <div style={{ width: "100%", height, position: "relative" }}>{children}</div>
    </div>
  );
}

function Skeleton({ height }: { height: number }) {
  return (
    <div className="rounded-xl border p-4" style={{ backgroundColor: "var(--surface-card)", borderColor: "var(--border-subtle)" }}>
      <div
        className="rounded-lg animate-pulse"
        style={{ height, backgroundColor: "var(--surface-overlay)" }}
      />
    </div>
  );
}

export function ChartsClient({
  basisBreakdown,
  fomoDistribution,
  dangerBreakdown,
  actionBreakdown,
  weeklyTrend,
  disciplineTrend,
  disciplineTrendHint,
  fomoVsReturn,
}: {
  basisBreakdown: BasisBreakdownItem[];
  fomoDistribution: FomoDistItem[];
  dangerBreakdown: DangerBreakdownItem[];
  actionBreakdown: ActionBreakdownItem[];
  weeklyTrend: WeeklyTrendItem[];
  disciplineTrend: DisciplineTrendItem[];
  disciplineTrendHint: string;
  fomoVsReturn: FomoVsReturnItem[];
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(id);
  }, []);

  useSuppressRechartsInitWarning();

  if (!mounted) {
    return (
      <>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Skeleton height={240} />
          <Skeleton height={240} />
          <Skeleton height={200} />
          <Skeleton height={200} />
        </div>
        <Skeleton height={240} />
        <Skeleton height={200} />
        <Skeleton height={200} />
      </>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <ChartCard title="决策依据分布" hint="绿色=理性 · 红色=非理性" height={240}>
          <BasisChart data={basisBreakdown} />
        </ChartCard>

        <ChartCard title="FOMO 评分分布" hint="红色≥7 为高危区" height={240}>
          <FomoChart data={fomoDistribution} />
        </ChartCard>

        <ChartCard title="高危信号统计" height={200}>
          <DangerChart data={dangerBreakdown} />
        </ChartCard>

        <ChartCard title="操作方向分布" height={200}>
          <ActionPie data={actionBreakdown} />
        </ChartCard>
      </div>

      {/* FOMO vs 盈亏散点图 — PRD 图2：冲击力最强的那张 */}
      <ChartCard
        title="FOMO 评分 vs 30日实际盈亏"
        hint="红色=FOMO≥7 · 蓝色=正常 · 竖线=高危分界"
        height={240}
      >
        <FomoScatterChart data={fomoVsReturn} />
      </ChartCard>

      <ChartCard title="每周操作趋势" hint="蓝色=总操作 · 橙色虚线=高危" height={200}>
        <WeeklyTrendChart data={weeklyTrend} />
      </ChartCard>

      <ChartCard title="纪律分趋势" hint={disciplineTrendHint} height={200}>
        <DisciplineChart data={disciplineTrend} />
      </ChartCard>
    </>
  );
}
