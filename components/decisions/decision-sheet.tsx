"use client";

import { useEffect, useState, useCallback } from "react";
import { X, AlertTriangle, ExternalLink } from "lucide-react";
import Link from "next/link";
import dayjs from "dayjs";
import { DecisionTracking } from "./decision-tracking";
import { ErrorTagger } from "@/components/errors/error-tagger";
import { ACTION_LABELS, RATIONAL_BASIS, ALIGNMENT_LABELS } from "@/types/decision";
import type { Decision } from "@/types/decision";

type ErrorLog = {
  id: string;
  errorTypeId: string;
  errorTypeName: string;
  decisionId: string | null;
  note: string;
  cost: number | null;
  occurredAt: number;
};

type ErrorType = {
  id: string;
  name: string;
  description: string;
  isPreset: boolean;
  occurrences: number;
  totalCost: number | null;
  lastOccurredAt: number | null;
  trend: string;
};

type Props = {
  decisionId: string | null;
  onClose: () => void;
};

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] mb-0.5" style={{ color: "var(--muted-foreground)" }}>{label}</div>
      <div className="text-sm" style={{ color: "var(--foreground)" }}>{value}</div>
    </div>
  );
}

function ScoreBadge({ value, invert = false }: { value: number; invert?: boolean }) {
  const bad = invert ? value >= 7 : value <= 4;
  const good = invert ? value < 5 : value >= 7;
  const color = bad ? "var(--brand-red)" : good ? "var(--brand-green)" : "var(--brand-warning)";
  return (
    <span
      className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-sm font-bold"
      style={{ backgroundColor: `${color}22`, color }}
    >
      {value}
    </span>
  );
}

const alignmentColors: Record<string, string> = {
  ALIGN: "var(--brand-green)",
  PARTIAL: "var(--brand-warning)",
  NOT_ALIGN: "var(--brand-red)",
};

export function DecisionSheet({ decisionId, onClose }: Props) {
  const [decision, setDecision] = useState<Decision | null>(null);
  const [errorLogs, setErrorLogs] = useState<ErrorLog[]>([]);
  const [errorTypes, setErrorTypes] = useState<ErrorType[]>([]);
  const [loading, setLoading] = useState(false);

  const open = decisionId !== null;

  const fetchData = useCallback(async (id: string) => {
    setLoading(true);
    setDecision(null);
    try {
      const [dRes, logsRes, typesRes] = await Promise.all([
        fetch(`/api/decisions/${id}`),
        fetch(`/api/decisions/${id}/errors`),
        fetch(`/api/errors`),
      ]);
      const [d, logs, types] = await Promise.all([
        dRes.json() as Promise<Decision>,
        logsRes.json() as Promise<ErrorLog[]>,
        typesRes.json() as Promise<ErrorType[]>,
      ]);
      setDecision(d);
      setErrorLogs(logs);
      setErrorTypes(types);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (decisionId) fetchData(decisionId);
  }, [decisionId, fetchData]);

  // ESC to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  const isBuy = decision && (decision.action === "BUY" || decision.action === "ADD");
  const actionColor = isBuy ? "var(--color-up)" : "var(--color-down)";

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        onClick={onClose}
      />

      {/* Sheet panel */}
      <div
        className="fixed right-0 top-0 bottom-0 z-50 flex flex-col overflow-hidden"
        style={{
          width: "min(580px, 100vw)",
          backgroundColor: "var(--surface-base)",
          borderLeft: "1px solid var(--border-subtle)",
          boxShadow: "-8px 0 32px rgba(0,0,0,0.3)",
        }}
      >
        {/* Sheet header */}
        <div
          className="flex items-center justify-between px-5 py-4 shrink-0"
          style={{ borderBottom: "1px solid var(--border-subtle)" }}
        >
          <span className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
            决策详情
          </span>
          <div className="flex items-center gap-2">
            {decision && (
              <Link
                href={`/decisions/${decision.id}`}
                className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg transition-opacity hover:opacity-80"
                style={{
                  color: "var(--muted-foreground)",
                  backgroundColor: "var(--surface-overlay)",
                  border: "1px solid var(--border-subtle)",
                }}
                onClick={onClose}
              >
                <ExternalLink size={12} />
                独立页面
              </Link>
            )}
            <button
              onClick={onClose}
              className="flex items-center justify-center w-8 h-8 rounded-lg transition-opacity hover:opacity-70"
              style={{ color: "var(--muted-foreground)", backgroundColor: "var(--surface-overlay)" }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Sheet content */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center h-48">
              <div className="text-sm" style={{ color: "var(--muted-foreground)" }}>加载中…</div>
            </div>
          )}

          {!loading && decision && (
            <div className="px-5 py-5 space-y-5">
              {/* Header */}
              <div className="flex items-start gap-3">
                <span
                  className="text-[11px] font-bold px-2 py-0.5 rounded shrink-0 mt-0.5"
                  style={{ backgroundColor: `${actionColor}22`, color: actionColor }}
                >
                  {ACTION_LABELS[decision.action]}
                </span>
                <div>
                  <h2 className="text-lg font-bold" style={{ color: "var(--foreground)" }}>
                    {decision.stockName}
                    <span className="text-sm font-normal ml-2" style={{ color: "var(--muted-foreground)" }}>
                      {decision.stockCode}
                    </span>
                  </h2>
                  <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>
                    {dayjs(decision.createdAt).format("YYYY年MM月DD日 HH:mm")}
                  </p>
                </div>
              </div>

              {/* Danger banner */}
              {decision.dangerSignals.length > 0 && (
                <div
                  className="flex items-start gap-2 px-4 py-3 rounded-lg border"
                  style={{ backgroundColor: "rgba(245,158,11,0.07)", borderColor: "rgba(245,158,11,0.3)" }}
                >
                  <AlertTriangle size={15} className="shrink-0 mt-0.5" style={{ color: "var(--brand-warning)" }} />
                  <div>
                    <p className="text-sm font-medium" style={{ color: "var(--brand-warning)" }}>
                      系统检测到危险信号
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>
                      {decision.dangerSignals.join(" · ")}
                    </p>
                  </div>
                </div>
              )}

              {/* Core fields */}
              <div
                className="rounded-xl border p-4 space-y-4"
                style={{ backgroundColor: "var(--surface-card)", borderColor: "var(--border-subtle)" }}
              >
                <h3 className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>
                  交易基础
                </h3>
                <div className="grid grid-cols-3 gap-x-4 gap-y-3">
                  <Field label="计划价格" value={`¥${decision.price}`} />
                  <Field label="数量" value={`${decision.quantity.toLocaleString()} 股`} />
                  <Field label="金额" value={`¥${decision.amount.toLocaleString()}`} />
                  <Field label="止损价" value={`¥${decision.stopLossPrice}`} />
                  <Field label="最大可亏" value={`¥${decision.maxAcceptableLoss.toLocaleString()}`} />
                  <Field
                    label="符合体系"
                    value={
                      <span style={{ color: alignmentColors[decision.systemAlignment] }}>
                        {ALIGNMENT_LABELS[decision.systemAlignment]}
                      </span>
                    }
                  />
                </div>
                <div>
                  <div className="text-[11px] mb-1" style={{ color: "var(--muted-foreground)" }}>一句话理由</div>
                  <p className="text-sm" style={{ color: "var(--foreground)" }}>{decision.reason}</p>
                </div>
              </div>

              {/* Basis & emotion */}
              <div
                className="rounded-xl border p-4 space-y-4"
                style={{ backgroundColor: "var(--surface-card)", borderColor: "var(--border-subtle)" }}
              >
                <h3 className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>
                  决策依据与情绪
                </h3>
                <div>
                  <div className="text-[11px] mb-2" style={{ color: "var(--muted-foreground)" }}>决策依据</div>
                  <div className="flex flex-wrap gap-1.5">
                    {decision.basis.map((b) => {
                      const isRational = (RATIONAL_BASIS as string[]).includes(b);
                      const color = isRational ? "var(--brand-green)" : "var(--brand-red)";
                      return (
                        <span
                          key={b}
                          className="text-[11px] px-2 py-0.5 rounded"
                          style={{ backgroundColor: `${color}22`, color }}
                        >
                          {b}
                        </span>
                      );
                    })}
                  </div>
                </div>
                <div className="flex gap-6">
                  <div className="text-center">
                    <div className="text-[11px] mb-1.5" style={{ color: "var(--muted-foreground)" }}>平静度</div>
                    <ScoreBadge value={decision.calmScore} />
                  </div>
                  <div className="text-center">
                    <div className="text-[11px] mb-1.5" style={{ color: "var(--muted-foreground)" }}>信心度</div>
                    <ScoreBadge value={decision.confidenceScore} />
                  </div>
                  <div className="text-center">
                    <div className="text-[11px] mb-1.5" style={{ color: "var(--muted-foreground)" }}>FOMO</div>
                    <ScoreBadge value={decision.fomoScore} invert />
                  </div>
                </div>
              </div>

              {/* Price tracking */}
              <div
                className="rounded-xl border p-4"
                style={{ backgroundColor: "var(--surface-card)", borderColor: "var(--border-subtle)" }}
              >
                <DecisionTracking decision={decision} />
              </div>

              {/* Error tagging */}
              <div
                className="rounded-xl border p-4"
                style={{ backgroundColor: "var(--surface-card)", borderColor: "var(--border-subtle)" }}
              >
                <ErrorTagger
                  decisionId={decision.id}
                  decisionAmount={decision.amount}
                  return30Days={decision.return30Days ?? null}
                  initialLogs={errorLogs}
                  allErrorTypes={errorTypes}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
