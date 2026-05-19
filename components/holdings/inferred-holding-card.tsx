"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FilePlus, TrendingUp, TrendingDown } from "lucide-react";
import type { Holding } from "@/types/holding";

type Props = { holding: Holding };

export function InferredHoldingCard({ holding: h }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClaim() {
    setLoading(true);
    try {
      const res = await fetch("/api/holdings/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stockCode: h.stockCode }),
      });
      if (!res.ok) throw new Error("failed");
      const created = await res.json() as { id: string };
      router.push(`/holdings/${created.id}`);
      router.refresh();
    } catch {
      setLoading(false);
    }
  }

  const isBuy = h.status === "HOLDING";
  const amountWan = (h.costPrice * h.shares) / 10_000;

  return (
    <div
      className="rounded-xl border p-4 flex items-start gap-4"
      style={{
        borderColor: "var(--border-subtle)",
        backgroundColor: "var(--surface-card)",
        borderLeftWidth: 3,
        borderLeftColor: isBuy ? "var(--color-up)" : "var(--muted-foreground)",
        opacity: 0.85,
      }}
    >
      {/* Icon */}
      <div
        className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center mt-0.5"
        style={{ backgroundColor: isBuy ? "rgba(239,68,68,0.1)" : "rgba(148,163,184,0.12)" }}
      >
        {isBuy
          ? <TrendingUp size={15} style={{ color: "var(--color-up)" }} />
          : <TrendingDown size={15} style={{ color: "var(--muted-foreground)" }} />}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-sm" style={{ color: "var(--foreground)" }}>
            {h.stockName}
          </span>
          <span className="text-xs font-mono" style={{ color: "var(--muted-foreground)" }}>
            {h.stockCode}
          </span>
          <span
            className="text-[10px] px-1.5 py-0.5 rounded"
            style={{ backgroundColor: "rgba(148,163,184,0.12)", color: "var(--muted-foreground)" }}
          >
            从决策卡聚合
          </span>
        </div>
        <div className="flex items-center gap-3 mt-1 text-xs" style={{ color: "var(--muted-foreground)" }}>
          {h.shares > 0 ? (
            <>
              <span>成本 ¥{h.costPrice.toLocaleString()}</span>
              <span className="opacity-40">·</span>
              <span>{h.shares.toLocaleString()} 股</span>
              {amountWan >= 0.1 && (
                <>
                  <span className="opacity-40">·</span>
                  <span>¥{amountWan.toFixed(1)} 万</span>
                </>
              )}
            </>
          ) : (
            <span>已清仓</span>
          )}
        </div>
      </div>

      {/* Claim button */}
      <button
        type="button"
        onClick={handleClaim}
        disabled={loading}
        className="shrink-0 flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80 disabled:opacity-50"
        style={{
          backgroundColor: "var(--brand-blue)",
          color: "#fff",
        }}
      >
        <FilePlus size={13} />
        {loading ? "建档中…" : "建立档案"}
      </button>
    </div>
  );
}
