"use client";

import { useState, useEffect, useCallback } from "react";
import { X, ExternalLink } from "lucide-react";
import Link from "next/link";
import type { Holding } from "@/types/holding";
import type { Decision } from "@/types/decision";
import { STATUS_LABELS, STATUS_COLORS } from "@/types/holding";
import { HoldingDetailTabs } from "./holding-detail-tabs";
import { HoldingForm } from "./holding-form";
import { inferSector } from "@/lib/sector-inference";

// ─── Types ────────────────────────────────────────────────────────────────────

export type HoldingSheetMode =
  | { type: "new" }
  | { type: "detail"; holding: Holding };

type Props = {
  open: boolean;
  mode: HoldingSheetMode;
  onClose: () => void;
  /** Called when a new holding is created; lets the parent switch to detail mode. */
  onCreated?: (holding: Holding) => void;
};

// ─── Helper ───────────────────────────────────────────────────────────────────

function healthColor(score: number): string {
  if (score >= 60) return "var(--brand-green)";
  if (score >= 30) return "var(--brand-warning)";
  return "var(--brand-red)";
}

// ─── Sheet ────────────────────────────────────────────────────────────────────

export function HoldingSheet({ open, mode, onClose, onCreated }: Props) {
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [loadingDecisions, setLoadingDecisions] = useState(false);

  // Fetch related decisions when opening a detail sheet
  const holdingId    = mode.type === "detail" ? mode.holding.id : null;
  const stockCode    = mode.type === "detail" ? mode.holding.stockCode : null;
  useEffect(() => {
    if (!open || !stockCode) return;
    setDecisions([]);
    setLoadingDecisions(true);
    fetch(`/api/decisions?stockCode=${encodeURIComponent(stockCode)}`)
      .then((r) => r.json())
      .then((data) => setDecisions(Array.isArray(data) ? data as Decision[] : []))
      .catch(() => setDecisions([]))
      .finally(() => setLoadingDecisions(false));
  }, [open, holdingId, stockCode]);

  // ESC to close
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Body scroll lock
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const handleCreated = useCallback((holding: Holding) => {
    if (onCreated) onCreated(holding);
  }, [onCreated]);

  if (!open) return null;

  // ── Shared header builder ────────────────────────────────────────────────
  const isDetail = mode.type === "detail";
  const holding  = isDetail ? mode.holding : null;
  const sector   = holding ? (holding.sector || inferSector(holding.stockCode, holding.stockName)) : "";

  const pnlPct =
    holding?.currentPrice && holding?.costPrice
      ? ((holding.currentPrice - holding.costPrice) / holding.costPrice) * 100
      : null;

  const sheetHeader = (
    <div
      className="flex items-start justify-between px-5 py-4 shrink-0"
      style={{ borderBottom: "1px solid var(--border-subtle)" }}
    >
      <div className="min-w-0 flex-1 pr-3">
        {isDetail && holding ? (
          <>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-base" style={{ color: "var(--foreground)" }}>
                {holding.stockName}
              </span>
              <span className="text-sm font-mono" style={{ color: "var(--muted-foreground)" }}>
                {holding.stockCode} · {holding.stockMarket}
              </span>
              {sector && (
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded"
                  style={{ backgroundColor: "var(--surface-overlay)", color: "var(--muted-foreground)" }}
                >
                  {sector}
                </span>
              )}
              <span
                className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                style={{
                  color: STATUS_COLORS[holding.status],
                  backgroundColor: `${STATUS_COLORS[holding.status]}1A`,
                }}
              >
                {STATUS_LABELS[holding.status]}
              </span>
            </div>

            {/* Position row */}
            <div className="flex items-center gap-3 mt-1 flex-wrap text-sm" style={{ color: "var(--muted-foreground)" }}>
              {holding.shares > 0 ? (
                <>
                  <span>成本 ¥{holding.costPrice.toLocaleString()}</span>
                  <span className="opacity-40">·</span>
                  <span>{holding.shares.toLocaleString()} 股</span>
                  <span className="opacity-40">·</span>
                  <span>¥{((holding.costPrice * holding.shares) / 10_000).toFixed(1)} 万</span>
                  {pnlPct !== null && (
                    <>
                      <span className="opacity-40">·</span>
                      <span
                        className="font-bold"
                        style={{ color: pnlPct >= 0 ? "var(--color-up)" : "var(--color-down)" }}
                      >
                        {pnlPct >= 0 ? "+" : ""}{pnlPct.toFixed(2)}%
                      </span>
                    </>
                  )}
                </>
              ) : (
                <span>已清仓</span>
              )}
            </div>

            {/* Health bar */}
            <div className="mt-2 space-y-1">
              <div className="flex items-center justify-between" style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>
                <span>档案健康度</span>
                <span style={{ color: healthColor(holding.healthScore) }}>{holding.healthScore}/100</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "var(--surface-overlay)" }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${holding.healthScore}%`, backgroundColor: healthColor(holding.healthScore) }}
                />
              </div>
            </div>
          </>
        ) : (
          <div>
            <span className="font-bold text-base" style={{ color: "var(--foreground)" }}>新建持仓档案</span>
            <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>
              为这只股票建立逻辑档案，让每一笔持仓都有据可查
            </p>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {/* Open full page link for detail mode */}
        {isDetail && holding && (
          <Link
            href={`/holdings/${holding.id}`}
            target="_blank"
            className="p-1.5 rounded-md transition-colors hover:opacity-60"
            style={{ color: "var(--muted-foreground)" }}
            title="在新标签页打开"
          >
            <ExternalLink size={15} />
          </Link>
        )}
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-md transition-colors hover:opacity-60"
          style={{ color: "var(--muted-foreground)" }}
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );

  const sheetBody = (
    <div className="flex-1 overflow-y-auto px-5 py-4">
      {mode.type === "new" && (
        <HoldingForm onSuccess={handleCreated} />
      )}
      {mode.type === "detail" && holding && (
        <div className={loadingDecisions ? "opacity-60" : ""}>
          <HoldingDetailTabs holding={holding} decisions={decisions} />
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className="fixed right-0 top-0 bottom-0 z-50 flex flex-col shadow-2xl"
        style={{
          width: "min(480px, 100vw)",
          backgroundColor: "var(--surface-card)",
          borderLeft: "1px solid var(--border-subtle)",
        }}
      >
        {sheetHeader}
        {sheetBody}
      </div>
    </>
  );
}
