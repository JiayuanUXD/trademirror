"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createHoldingSchema } from "@/lib/validators/holding";
import type { HoldingStatus } from "@/types/holding";
import { STATUS_LABELS } from "@/types/holding";

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
      {/* Stock info */}
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <div className="space-y-1">
          <label className="text-xs" style={{ color: "var(--muted-foreground)" }}>股票代码</label>
          <input
            className="w-full h-9 px-3 rounded-md text-sm border"
            style={{ backgroundColor: "var(--surface-overlay)", borderColor: errors.stockCode ? "var(--brand-red)" : "var(--border-subtle)", color: "var(--foreground)" }}
            placeholder="600519"
            maxLength={6}
            value={form.stockCode}
            onChange={(e) => set("stockCode", e.target.value)}
          />
          {errors.stockCode && <p className="text-[11px]" style={{ color: "var(--brand-red)" }}>{errors.stockCode}</p>}
        </div>
        <div className="space-y-1">
          <label className="text-xs" style={{ color: "var(--muted-foreground)" }}>市场</label>
          <div className="flex gap-1">
            {MARKET_OPTIONS.map((m) => (
              <button key={m.value} type="button" onClick={() => set("stockMarket", m.value)}
                className="h-9 w-9 rounded-md text-xs font-medium transition-colors"
                style={{ backgroundColor: form.stockMarket === m.value ? "var(--brand-blue)" : "var(--surface-overlay)", color: form.stockMarket === m.value ? "#fff" : "var(--muted-foreground)", border: `1px solid ${form.stockMarket === m.value ? "var(--brand-blue)" : "var(--border-subtle)"}` }}>
                {m.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs" style={{ color: "var(--muted-foreground)" }}>股票名称</label>
        <input
          className="w-full h-9 px-3 rounded-md text-sm border"
          style={{ backgroundColor: "var(--surface-overlay)", borderColor: errors.stockName ? "var(--brand-red)" : "var(--border-subtle)", color: "var(--foreground)" }}
          placeholder="贵州茅台"
          value={form.stockName}
          onChange={(e) => set("stockName", e.target.value)}
        />
        {errors.stockName && <p className="text-[11px]" style={{ color: "var(--brand-red)" }}>{errors.stockName}</p>}
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
