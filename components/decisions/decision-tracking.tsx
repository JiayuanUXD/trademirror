"use client";

import { useState, useTransition } from "react";
import { TrendingUp, MessageSquare } from "lucide-react";
import type { Decision } from "@/types/decision";

type Props = { decision: Decision };

function PriceField({
  label,
  hint,
  value,
  onChange,
  onBlur,
  locked,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  onBlur: () => void;
  locked?: boolean;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium" style={{ color: "var(--muted-foreground)" }}>
        {label}
        {hint && <span className="ml-1 opacity-60">{hint}</span>}
      </label>
      <input
        type="number"
        step="0.01"
        min="0"
        className="w-full px-3 py-2 rounded-lg text-sm border"
        style={{
          backgroundColor: locked ? "var(--surface-base)" : "var(--surface-overlay)",
          borderColor: "var(--border-subtle)",
          color: "var(--foreground)",
        }}
        placeholder="—"
        disabled={locked}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
      />
    </div>
  );
}

export function DecisionTracking({ decision: initial }: Props) {
  const [decision, setDecision] = useState(initial);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  const [actualPrice, setActualPrice] = useState(
    initial.actualPrice != null ? String(initial.actualPrice) : ""
  );
  const [price7d, setPrice7d] = useState(
    initial.priceAfter7Days != null ? String(initial.priceAfter7Days) : ""
  );
  const [price30d, setPrice30d] = useState(
    initial.priceAfter30Days != null ? String(initial.priceAfter30Days) : ""
  );
  const [reflection, setReflection] = useState(initial.postReflection ?? "");

  async function patch(body: Record<string, unknown>) {
    const res = await fetch(`/api/decisions/${decision.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const updated = await res.json() as Decision;
      startTransition(() => {
        setDecision(updated);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      });
    }
  }

  function numOrNull(s: string): number | null {
    const n = parseFloat(s);
    return isNaN(n) || n <= 0 ? null : n;
  }

  const costBasis = numOrNull(actualPrice) ?? decision.actualPrice;
  const p30 = numOrNull(price30d) ?? decision.priceAfter30Days;
  const liveReturn = costBasis && p30
    ? Math.round(((p30 - costBasis) / costBasis) * 10000) / 100
    : null;

  const returnColor = liveReturn == null
    ? "var(--muted-foreground)"
    : liveReturn > 0
    ? "var(--color-up)"
    : liveReturn < 0
    ? "var(--color-down)"
    : "var(--foreground)";

  return (
    <div className={`space-y-5 ${isPending ? "opacity-70 pointer-events-none" : ""}`}>
      {/* Price tracking */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
            <TrendingUp size={16} className="text-brand-blue" /> 交易跟踪
          </h3>
          {saved && (
            <span className="text-xs" style={{ color: "var(--brand-green)" }}>已保存 ✓</span>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3">
          <PriceField
            label="实际成交价"
            value={actualPrice}
            onChange={setActualPrice}
            onBlur={() => patch({ actualPrice: numOrNull(actualPrice) })}
          />
          <PriceField
            label="7日后价格"
            value={price7d}
            onChange={setPrice7d}
            onBlur={() => patch({ priceAfter7Days: numOrNull(price7d) })}
          />
          <PriceField
            label="30日后价格"
            value={price30d}
            onChange={setPrice30d}
            onBlur={() => patch({ priceAfter30Days: numOrNull(price30d) })}
          />
        </div>

        {liveReturn != null && (
          <div
            className="mt-3 flex items-center justify-between px-4 py-2.5 rounded-lg border"
            style={{ backgroundColor: "var(--surface-overlay)", borderColor: "var(--border-subtle)" }}
          >
            <span className="text-sm" style={{ color: "var(--muted-foreground)" }}>
              30日持仓收益率
            </span>
            <span className="text-lg font-bold" style={{ color: returnColor }}>
              {liveReturn > 0 ? "+" : ""}{liveReturn}%
            </span>
          </div>
        )}
      </div>

      {/* Post reflection */}
      <div>
        <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5" style={{ color: "var(--foreground)" }}>
          <MessageSquare size={16} className="text-brand-purple" /> 事后复盘
        </h3>
        <textarea
          className="w-full px-3 py-2 rounded-lg text-sm border resize-none"
          style={{
            backgroundColor: "var(--surface-overlay)",
            borderColor: "var(--border-subtle)",
            color: "var(--foreground)",
          }}
          rows={4}
          maxLength={500}
          placeholder="这笔交易的结果符合预期吗？学到了什么？"
          value={reflection}
          onChange={(e) => setReflection(e.target.value)}
          onBlur={() => patch({ postReflection: reflection.trim() || null })}
        />
        <div className="flex justify-end mt-1">
          <span className="text-[11px]" style={{ color: reflection.length > 450 ? "var(--brand-red)" : "var(--muted-foreground)" }}>
            {reflection.length}/500
          </span>
        </div>
      </div>
    </div>
  );
}
