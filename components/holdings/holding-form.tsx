"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createHoldingSchema } from "@/lib/validators/holding";
import type { HoldingStatus } from "@/types/holding";
import { STATUS_LABELS } from "@/types/holding";
import { StockCombobox, StockItem } from "@/components/shared/stock-combobox";

const MARKET_OPTIONS = [
  { value: "SH" as const, label: "沪" },
  { value: "SZ" as const, label: "深" },
  { value: "BJ" as const, label: "北" },
];

export function HoldingForm() {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form, setForm] = useState({
    stockCode: "",
    stockName: "",
    stockMarket: "SH" as "SH" | "SZ" | "BJ",
    status: "HOLDING" as HoldingStatus,
    costPrice: "",
    shares: "",
    sector: "",
    initialReason: "",
  });

  function set<K extends keyof typeof form>(key: K, val: (typeof form)[K]) {
    setForm((p) => ({ ...p, [key]: val }));
    setErrors((e) => { const n = { ...e }; delete n[key]; return n; });
  }

  async function handleSubmit() {
    const parsed = createHoldingSchema.safeParse({
      ...form,
      costPrice: Number(form.costPrice),
      shares: Number(form.shares),
    });
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
      const holding = await res.json() as { id: string };
      router.push(`/holdings/${holding.id}`);
      router.refresh();
    } catch (err) {
      setErrors({ submit: err instanceof Error ? err.message : "提交失败" });
    } finally {
      setIsSubmitting(false);
    }
  }

  const amount = (Number(form.costPrice) || 0) * (Number(form.shares) || 0);

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
        <label className="text-xs" style={{ color: "var(--muted-foreground)" }}>状态</label>
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

      {/* Cost + shares */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs" style={{ color: "var(--muted-foreground)" }}>成本价（元）</label>
          <input type="number" min="0" step="0.01"
            className="w-full h-9 px-3 rounded-md text-sm border"
            style={{ backgroundColor: "var(--surface-overlay)", borderColor: errors.costPrice ? "var(--brand-red)" : "var(--border-subtle)", color: "var(--foreground)" }}
            placeholder="1800.00"
            value={form.costPrice}
            onChange={(e) => set("costPrice", e.target.value)}
          />
          {errors.costPrice && <p className="text-[11px]" style={{ color: "var(--brand-red)" }}>{errors.costPrice}</p>}
        </div>
        <div className="space-y-1">
          <label className="text-xs" style={{ color: "var(--muted-foreground)" }}>持股数量（股）</label>
          <input type="number" min="100" step="100"
            className="w-full h-9 px-3 rounded-md text-sm border"
            style={{ backgroundColor: "var(--surface-overlay)", borderColor: errors.shares ? "var(--brand-red)" : "var(--border-subtle)", color: "var(--foreground)" }}
            placeholder="100"
            value={form.shares}
            onChange={(e) => set("shares", e.target.value)}
          />
          {errors.shares && <p className="text-[11px]" style={{ color: "var(--brand-red)" }}>{errors.shares}</p>}
        </div>
      </div>

      {amount > 0 && (
        <div className="text-right text-sm" style={{ color: "var(--muted-foreground)" }}>
          持仓市值：<span style={{ color: "var(--foreground)", fontWeight: 600 }}>¥{amount.toLocaleString("zh-CN", { maximumFractionDigits: 0 })}</span>
        </div>
      )}

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
