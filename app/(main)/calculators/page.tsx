"use client";

import { useState, useCallback } from "react";
import {
  Crosshair, Target, TrendingUp, Receipt, Zap, HelpCircle,
} from "lucide-react";
import { PositionCalculator } from "@/components/calculators/position-calculator";
import { KellyCalculator } from "@/components/calculators/kelly-calculator";
import { CompoundCalculator } from "@/components/calculators/compound-calculator";
import { TaxCalculator } from "@/components/calculators/tax-calculator";
import { GridCalculator } from "@/components/calculators/grid-calculator";
import { AddPositionAdvisor } from "@/components/calculators/add-position-advisor";

type TabId = "position" | "kelly" | "compound" | "tax" | "grid" | "add";

const TABS: { id: TabId; label: string; icon: React.ReactNode; desc: string }[] = [
  { id: "position", label: "仓位计算", icon: <Crosshair size={18} />, desc: "买多少股合理" },
  { id: "kelly",    label: "凯利公式", icon: <Target size={18} />,    desc: "最优仓位比例" },
  { id: "compound", label: "复利计算", icon: <TrendingUp size={18} />, desc: "长期收益预测" },
  { id: "tax",      label: "税费计算", icon: <Receipt size={18} />,   desc: "净收益测算" },
  { id: "grid",     label: "网格交易", icon: <Zap size={18} />,       desc: "震荡高抛低吸" },
  { id: "add",      label: "加仓决策", icon: <HelpCircle size={18} />, desc: "该不该加仓" },
];

export default function CalculatorsPage() {
  const [active, setActive] = useState<TabId>("position");

  const handleSelect = useCallback((id: TabId) => {
    setActive(id);
  }, []);

  const activeTab = TABS.find((t) => t.id === active);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold" style={{ color: "var(--foreground)" }}>计算器套件</h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--muted-foreground)" }}>
          数字化你的每一个决策，让直觉让位于计算
        </p>
      </div>

      {/* Tab grid
          Safari 兼容性：Safari 的 <button> 不支持 flex-col 布局内的子元素点击冒泡，
          因此改用 <div role="button"> + onKeyDown 来实现无障碍可点击区域。 */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {TABS.map((tab) => {
          const isActive = active === tab.id;
          return (
            <div
              key={tab.id}
              role="button"
              tabIndex={0}
              onClick={() => handleSelect(tab.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleSelect(tab.id);
                }
              }}
              className="flex flex-col items-center gap-1 px-2 py-3 rounded-xl text-xs cursor-pointer select-none"
              style={{
                WebkitTapHighlightColor: "transparent",
                WebkitUserSelect: "none",
                backgroundColor: isActive ? "rgba(99,102,241,0.15)" : "var(--surface-card)",
                color: isActive ? "var(--brand-purple)" : "var(--muted-foreground)",
                border: `1px solid ${isActive ? "rgba(99,102,241,0.3)" : "var(--border-subtle)"}`,
              }}
            >
              <span className="leading-none">{tab.icon}</span>
              <span className="font-medium text-center leading-tight">{tab.label}</span>
              <span className="text-[10px] opacity-70 text-center leading-tight">{tab.desc}</span>
            </div>
          );
        })}
      </div>

      {/* Calculator body */}
      <div
        className="rounded-xl border p-5"
        style={{ backgroundColor: "var(--surface-card)", borderColor: "var(--border-subtle)" }}
      >
        <h2 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--foreground)" }}>
          <span>{activeTab?.icon}</span>
          {activeTab?.label}
        </h2>
        {active === "position" && <PositionCalculator />}
        {active === "kelly" && <KellyCalculator />}
        {active === "compound" && <CompoundCalculator />}
        {active === "tax" && <TaxCalculator />}
        {active === "grid" && <GridCalculator />}
        {active === "add" && <AddPositionAdvisor />}
      </div>

      {/* Disclaimer */}
      <p className="text-[11px] text-center" style={{ color: "var(--muted-foreground)", opacity: 0.5 }}>
        以上计算仅供参考，不构成投资建议。请结合自身情况判断。
      </p>
    </div>
  );
}
