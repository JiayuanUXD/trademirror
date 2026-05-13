"use client";

import { useState } from "react";
import { PositionCalculator } from "@/components/calculators/position-calculator";
import { KellyCalculator } from "@/components/calculators/kelly-calculator";
import { CompoundCalculator } from "@/components/calculators/compound-calculator";
import { TaxCalculator } from "@/components/calculators/tax-calculator";
import { GridCalculator } from "@/components/calculators/grid-calculator";
import { AddPositionAdvisor } from "@/components/calculators/add-position-advisor";

type TabId = "position" | "kelly" | "compound" | "tax" | "grid" | "add";

const TABS: { id: TabId; label: string; emoji: string; desc: string }[] = [
  { id: "position", label: "仓位计算", emoji: "📐", desc: "买多少股合理" },
  { id: "kelly",    label: "凯利公式", emoji: "🎯", desc: "最优仓位比例" },
  { id: "compound", label: "复利计算", emoji: "📈", desc: "长期收益预测" },
  { id: "tax",      label: "税费计算", emoji: "🧾", desc: "净收益测算" },
  { id: "grid",     label: "网格交易", emoji: "⚡", desc: "震荡高抛低吸" },
  { id: "add",      label: "加仓决策", emoji: "🤔", desc: "该不该加仓" },
];

export default function CalculatorsPage() {
  const [active, setActive] = useState<TabId>("position");

  const content: Record<TabId, React.ReactNode> = {
    position: <PositionCalculator />,
    kelly:    <KellyCalculator />,
    compound: <CompoundCalculator />,
    tax:      <TaxCalculator />,
    grid:     <GridCalculator />,
    add:      <AddPositionAdvisor />,
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold" style={{ color: "var(--foreground)" }}>计算器套件</h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--muted-foreground)" }}>
          数字化你的每一个决策，让直觉让位于计算
        </p>
      </div>

      {/* Tab grid */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {TABS.map((tab) => {
          const isActive = active === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActive(tab.id)}
              className="flex flex-col items-center gap-1 px-2 py-3 rounded-xl text-xs transition-colors"
              style={{
                backgroundColor: isActive ? "rgba(99,102,241,0.15)" : "var(--surface-card)",
                color: isActive ? "var(--brand-purple)" : "var(--muted-foreground)",
                border: `1px solid ${isActive ? "rgba(99,102,241,0.3)" : "var(--border-subtle)"}`,
              }}
            >
              <span className="text-lg leading-none">{tab.emoji}</span>
              <span className="font-medium text-center leading-tight">{tab.label}</span>
              <span className="text-[10px] opacity-70 text-center leading-tight">{tab.desc}</span>
            </button>
          );
        })}
      </div>

      {/* Calculator body */}
      <div
        className="rounded-xl border p-5"
        style={{ backgroundColor: "var(--surface-card)", borderColor: "var(--border-subtle)" }}
      >
        <h2 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--foreground)" }}>
          <span>{TABS.find((t) => t.id === active)?.emoji}</span>
          {TABS.find((t) => t.id === active)?.label}
        </h2>
        {content[active]}
      </div>

      {/* Disclaimer */}
      <p className="text-[11px] text-center" style={{ color: "var(--muted-foreground)", opacity: 0.5 }}>
        以上计算仅供参考，不构成投资建议。请结合自身情况判断。
      </p>
    </div>
  );
}
