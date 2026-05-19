"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createHoldingSchema } from "@/lib/validators/holding";
import type { Holding, HoldingStatus } from "@/types/holding";
import { STATUS_LABELS } from "@/types/holding";
import { StockCombobox, StockItem } from "@/components/shared/stock-combobox";

const MARKET_OPTIONS = [
  { value: "SH" as const, label: "沪" },
  { value: "SZ" as const, label: "深" },
  { value: "BJ" as const, label: "北" },
];

type Props = {
  /** Called with the newly created holding instead of navigating away. */
  onSuccess?: (holding: Holding) => void;
};

export function HoldingForm({ onSuccess }: Props = {}) {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form, setForm] = useState({
    stockCode: "",
    stockName: "",
    stockMarket: "SH" as "SH" | "SZ" | "BJ",
    status: "WATCHING" as HoldingStatus,
    sector: "",
    initialReason: "",
  });

  function set<K extends keyof typeof form>(key: K, val: (typeof form)[K]) {
    setForm((p) => ({ ...p, [key]: val }));
    setErrors((e) => { const n = { ...e }; delete n[key]; return n; });
  }

  async function handleSubmit() {
    const parsed = createHoldingSchema.safeParse(form);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as string;
        if (!errs[key]) errs[key] = issue.message;
      }
      setErrors(errs);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/holdings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error ?? "提交失败");
      }
      const holding = await res.json() as Holding;
      if (onSuccess) {
        onSuccess(holding);
      } else {
        router.push(`/holdings/${holding.id}`);
        router.refresh();
      }
    } catch (err) {
      setErrors({ submit: err instanceof Error ? err.message : "提交失败" });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Stock search */}
      <div className="space-y-1">
        <label className="text-xs" style={{ color: "var(--muted-foreground)" }}>股票（输入代码或名称搜索）</label>
        <StockCombobox
          initialCode={form.stockCode}
          initialName={form.stockName}
          onSelect={(stock: StockItem) => {
            setForm((p) => ({ ...p, stockCode: stock.code, stockName: stock.name, stockMarket: stock.market }));
            setErrors((e) => { const n = { ...e }; delete n.stockCode; delete n.stockName; return n; });
          }}
        />
        {(errors.stockCode || errors.stockName) && (
          <p className="text-[11px]" style={{ color: "var(--brand-red)" }}>{errors.stockCode || errors.stockName}</p>
        )}
        {form.stockCode && (
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs font-mono" style={{ color: "var(--brand-blue)" }}>{form.stockCode}</span>
            <span className="text-xs" style={{ color: "var(--foreground)" }}>{form.stockName}</span>
            <span
              className="text-[10px] px-1.5 py-0.5 rounded font-medium"
              style={{ backgroundColor: "rgba(148,163,184,0.12)", color: "var(--muted-foreground)" }}
            >
              {form.stockMarket === "SH" ? "沪" : form.stockMarket === "SZ" ? "深" : "北"}
            </span>
          </div>
        )}
      </div>

      {/* Status */}
      <div className="space-y-1">
        <label className="text-xs" style={{ color: "var(--muted-foreground)" }}>
          初始状态
          <span className="ml-1 opacity-60">（持仓数量与成本价将自动从决策卡计算）</span>
        </label>
        <div className="flex gap-2">
          {(["HOLDING", "WATCHING", "CLOSED"] as HoldingStatus[]).map((s) => {
            const isActive = form.status === s;
            const colors = { HOLDING: "var(--brand-green)", WATCHING: "var(--brand-warning)", CLOSED: "var(--muted-foreground)" };
            const c = colors[s];
            return (
              <button key={s} type="button" onClick={() => set("status", s)}
                className="flex-1 h-9 rounded-md text-xs font-medium transition-colors"
                style={{ backgroundColor: isActive ? `${c}22` : "var(--surface-overlay)", color: isActive ? c : "var(--muted-foreground)", border: `1px solid ${isActive ? c : "var(--border-subtle)"}` }}>
                {STATUS_LABELS[s]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Sector */}
      <div className="space-y-1">
        <label className="text-xs" style={{ color: "var(--muted-foreground)" }}>板块（选填）</label>
        <input
          className="w-full h-9 px-3 rounded-md text-sm border"
          style={{ backgroundColor: "var(--surface-overlay)", borderColor: "var(--border-subtle)", color: "var(--foreground)" }}
          placeholder="白酒 / 新能源 / 半导体…"
          value={form.sector}
          onChange={(e) => set("sector", e.target.value)}
        />
      </div>

      {/* Initial reason */}
      <div className="space-y-1">
        <label className="text-xs" style={{ color: "var(--muted-foreground)" }}>首条持有理由（选填）</label>
        <input
          className="w-full h-9 px-3 rounded-md text-sm border"
          style={{ backgroundColor: "var(--surface-overlay)", borderColor: "var(--border-subtle)", color: "var(--foreground)" }}
          placeholder="估值处于历史低位，基本面无明显恶化"
          maxLength={100}
          value={form.initialReason}
          onChange={(e) => set("initialReason", e.target.value)}
        />
      </div>

      {errors.submit && (
        <p className="text-sm text-center" style={{ color: "var(--brand-red)" }}>{errors.submit}</p>
      )}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={isSubmitting}
        className="w-full h-10 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50"
        style={{ backgroundColor: "var(--brand-blue)" }}
      >
        {isSubmitting ? "创建中…" : "创建持仓档案"}
      </button>
    </div>
  );
}
