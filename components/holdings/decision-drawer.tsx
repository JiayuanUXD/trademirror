"use client";

import { useEffect, useCallback, Suspense } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { DecisionForm } from "@/components/decisions/decision-form";
import type { DecisionAction } from "@/types/decision";

export type DecisionDrawerState = {
  open: boolean;
  stockCode: string;
  stockName: string;
  stockMarket: "SH" | "SZ" | "BJ";
  action: DecisionAction;
  parentId?: string;
};

export const DECISION_DRAWER_CLOSED: DecisionDrawerState = {
  open: false,
  stockCode: "",
  stockName: "",
  stockMarket: "SH",
  action: "BUY",
};

type Props = {
  state: DecisionDrawerState;
  onClose: () => void;
};

const ACTION_TITLES: Record<DecisionAction, string> = {
  BUY: "买入",
  SELL: "卖出",
  ADD: "加仓",
  REDUCE: "减仓",
  CLEAR: "清仓",
};

export function DecisionDrawer({ state, onClose }: Props) {
  // ESC to close
  useEffect(() => {
    if (!state.open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state.open, onClose]);

  // Lock scroll
  useEffect(() => {
    const el = document.getElementById("main-scroll");
    if (!el) return;
    if (state.open) {
      el.style.overflow = "hidden";
    } else {
      el.style.overflow = "";
    }
    return () => { el.style.overflow = ""; };
  }, [state.open]);

  const handleSuccess = useCallback(() => {
    onClose();
  }, [onClose]);

  if (!state.open) return null;

  const title = `${ACTION_TITLES[state.action] ?? "交易"} · ${state.stockName}`;

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className="fixed inset-y-0 right-0 z-50 flex flex-col w-full sm:max-w-lg"
        style={{ backgroundColor: "var(--surface-card)" }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 shrink-0"
          style={{ borderBottom: "1px solid var(--border-subtle)" }}
        >
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold" style={{ color: "var(--foreground)" }}>
              {title}
            </h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>
              {state.stockCode} · {state.stockMarket}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md transition-colors hover:bg-[var(--surface-overlay)]"
          >
            <X size={18} style={{ color: "var(--muted-foreground)" }} />
          </button>
        </div>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          <Suspense
            fallback={
              <div className="h-48 flex items-center justify-center">
                <span className="text-sm" style={{ color: "var(--muted-foreground)" }}>加载中…</span>
              </div>
            }
          >
            <DecisionForm
              initialValues={{
                stockCode: state.stockCode,
                stockName: state.stockName,
                stockMarket: state.stockMarket,
                action: state.action,
                parentId: state.parentId,
              }}
              onSuccess={handleSuccess}
            />
          </Suspense>
        </div>
      </div>
    </>,
    document.body,
  );
}
