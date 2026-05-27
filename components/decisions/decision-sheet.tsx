"use client";

import { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { X, AlertTriangle, ExternalLink, Archive, Ban, TrendingDown, TrendingUp, PenLine } from "lucide-react";
import Link from "next/link";
import dayjs from "dayjs";
import { DecisionTracking } from "./decision-tracking";
import { ErrorTagger } from "@/components/errors/error-tagger";
import { ACTION_LABELS, RATIONAL_BASIS, IRRATIONAL_BASIS, ALIGNMENT_LABELS, STATUS_LABELS, VOIDED_REASON_LABELS } from "@/types/decision";
import type { Decision, VoidedReason, DecisionBasis } from "@/types/decision";

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
  onDecisionChange?: () => void;
  /** "sheet" (default) = fixed overlay from the right.
   *  "panel" = inline, fills its container — no backdrop, no body-scroll lock. */
  variant?: "sheet" | "panel";
  /** When true, the inline completion form is expanded immediately on open. */
  autoExpandComplete?: boolean;
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

export function DecisionSheet({ decisionId, onClose, onDecisionChange, variant = "sheet", autoExpandComplete = false }: Props) {
  const [decision, setDecision] = useState<Decision | null>(null);
  const [errorLogs, setErrorLogs] = useState<ErrorLog[]>([]);
  const [errorTypes, setErrorTypes] = useState<ErrorType[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showVoidConfirm, setShowVoidConfirm] = useState(false);
  const [voidReason, setVoidReason] = useState<VoidedReason>("INPUT_ERROR");

  // Completion form state
  const [showCompleteForm, setShowCompleteForm] = useState(false);
  const [completeForm, setCompleteForm] = useState({
    reason: "",
    basis: [] as DecisionBasis[],
    systemAlignment: "ALIGN" as "ALIGN" | "PARTIAL" | "NOT_ALIGN",
    calmScore: 5,
    confidenceScore: 5,
    fomoScore: 3,
    stopLossPrice: "",
  });
  const [completeLoading, setCompleteLoading] = useState(false);
  const [completeError, setCompleteError] = useState("");

  const open = decisionId !== null;

  const fetchData = useCallback(async (id: string, signal?: AbortSignal) => {
    setLoading(true);
    setDecision(null);
    setFetchError(false);
    try {
      const [dRes, logsRes, typesRes] = await Promise.all([
        fetch(`/api/decisions/${id}`, { signal }),
        fetch(`/api/decisions/${id}/errors`, { signal }),
        fetch(`/api/errors`, { signal }),
      ]);
      if (!dRes.ok || !logsRes.ok || !typesRes.ok) throw new Error("fetch failed");
      const [d, logs, types] = await Promise.all([
        dRes.json() as Promise<Decision>,
        logsRes.json() as Promise<ErrorLog[]>,
        typesRes.json() as Promise<ErrorType[]>,
      ]);
      setDecision(d);
      setErrorLogs(logs);
      setErrorTypes(types);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!decisionId) return;
    // Reset both expansion state and form values for each new decision opened
    setShowCompleteForm(autoExpandComplete);
    setCompleteForm({
      reason: "",
      basis: [],
      systemAlignment: "ALIGN",
      calmScore: 5,
      confidenceScore: 5,
      fomoScore: 3,
      stopLossPrice: "",
    });
    setCompleteError("");
    const controller = new AbortController();
    fetchData(decisionId, controller.signal);
    return () => controller.abort();
  }, [decisionId, fetchData, autoExpandComplete]);

  // ESC to close (sheet mode only)
  useEffect(() => {
    if (!open || variant !== "sheet") return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose, variant]);

  // Prevent main-scroll container from scrolling when sheet is open
  useEffect(() => {
    if (variant !== "sheet") return;
    const el = document.getElementById("main-scroll");
    if (!el) return;
    if (open) {
      el.style.overflow = "hidden";
    } else {
      el.style.overflow = "";
    }
    return () => { el.style.overflow = ""; };
  }, [open, variant]);

  async function handleVoid() {
    setActionLoading("void");
    try {
      const res = await fetch(`/api/decisions/${decisionId}/void`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: voidReason }),
      });
      if (res.ok) {
        const updated = await res.json() as Decision;
        setDecision(updated);
        setShowVoidConfirm(false);
        onDecisionChange?.();
      }
    } catch { /* keep */ }
    finally { setActionLoading(null); }
  }

  async function handleArchive() {
    setActionLoading("archive");
    try {
      const res = await fetch(`/api/decisions/${decisionId}/archive`, { method: "PATCH" });
      if (res.ok) {
        const updated = await res.json() as Decision;
        setDecision(updated);
        onDecisionChange?.();
      }
    } catch { /* keep */ }
    finally { setActionLoading(null); }
  }

  async function handleComplete() {
    if (!decisionId || !decision) return;
    const isSellAction = ["SELL", "REDUCE", "CLEAR"].includes(decision.action);
    const stopLoss = isSellAction ? 0 : parseFloat(completeForm.stopLossPrice);
    if (!completeForm.reason.trim()) { setCompleteError("请填写决策理由"); return; }
    if (completeForm.basis.length === 0) { setCompleteError("请至少选择一项决策依据"); return; }
    if (!isSellAction && (isNaN(stopLoss) || stopLoss <= 0)) { setCompleteError("请输入有效的止损价格"); return; }
    setCompleteError("");
    setCompleteLoading(true);
    try {
      const res = await fetch(`/api/decisions/${decisionId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...completeForm, stopLossPrice: stopLoss }),
      });
      if (!res.ok) {
        const err = await res.json() as { error?: string };
        setCompleteError(err.error ?? "补全失败，请重试");
        return;
      }
      const updated = await res.json() as Decision;
      setDecision(updated);
      setShowCompleteForm(false);
      onDecisionChange?.();
    } catch {
      setCompleteError("网络错误，请重试");
    } finally {
      setCompleteLoading(false);
    }
  }

  const isBuy = decision && (decision.action === "BUY" || decision.action === "ADD");
  const actionColor = isBuy ? "var(--color-up)" : "var(--color-down)";
  const isActive = decision?.status === "ACTIVE";
  const isVoided = decision?.status === "VOIDED";
  const isArchived = decision?.status === "ARCHIVED";
  const hasParent = !!decision?.parentId;

  const minutesSinceCreated = decision
    ? Math.floor((Date.now() - decision.createdAt) / 60_000)
    : Infinity;
  const canVoidWithoutReason = minutesSinceCreated <= 30;

  if (!open) return null;

  /* ── Shared header & scrollable content (used by both modes) ─────── */
  const sharedHeader = (
    <div
      className="flex items-center justify-between px-5 py-4 shrink-0"
      style={{ borderBottom: "1px solid var(--border-subtle)" }}
    >
      <span id="decision-sheet-title" className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
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
          aria-label="关闭"
          className="flex items-center justify-center w-8 h-8 rounded-lg transition-opacity hover:opacity-70"
          style={{ color: "var(--muted-foreground)", backgroundColor: "var(--surface-overlay)" }}
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );

  const sharedBody = (
    <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center h-48">
              <div className="text-sm" style={{ color: "var(--muted-foreground)" }}>加载中…</div>
            </div>
          )}

          {!loading && fetchError && (
            <div className="flex flex-col items-center justify-center h-48 gap-3">
              <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>加载失败，请重试</p>
              <button
                type="button"
                onClick={() => decisionId && fetchData(decisionId)}
                className="px-4 py-1.5 rounded-lg text-xs font-medium transition-opacity hover:opacity-80"
                style={{
                  backgroundColor: "var(--surface-overlay)",
                  color: "var(--foreground)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                重试
              </button>
            </div>
          )}

          {!loading && decision && (
            <div className="px-5 py-5 space-y-5">
              {/* Incomplete banner + inline completion form */}
              {decision.incomplete && isActive && (
                <div
                  className="rounded-lg border overflow-hidden"
                  style={{ borderColor: "rgba(245,158,11,0.35)" }}
                >
                  {/* Banner row */}
                  <div
                    className="flex items-center gap-2 px-4 py-3"
                    style={{ backgroundColor: "rgba(245,158,11,0.07)" }}
                  >
                    <PenLine size={15} className="shrink-0" style={{ color: "var(--brand-warning)" }} />
                    <p className="flex-1 text-sm font-medium" style={{ color: "var(--brand-warning)" }}>
                      此决策卡尚未补全
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowCompleteForm((v) => !v)}
                      className="text-xs font-medium px-3 py-1 rounded-md transition-colors"
                      style={{
                        backgroundColor: showCompleteForm ? "rgba(245,158,11,0.2)" : "rgba(245,158,11,0.12)",
                        color: "var(--brand-warning)",
                      }}
                    >
                      {showCompleteForm ? "收起" : "立即补全"}
                    </button>
                  </div>

                  {/* Inline completion form */}
                  {showCompleteForm && (
                    <div className="px-4 py-4 space-y-4" style={{ backgroundColor: "var(--surface-card)" }}>
                      {/* Reason */}
                      <div>
                        <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--muted-foreground)" }}>
                          一句话理由 *
                        </label>
                        <input
                          autoComplete="off"
                          className="w-full h-9 px-3 rounded-md text-sm border"
                          style={{ backgroundColor: "var(--surface-base)", borderColor: "var(--border-subtle)", color: "var(--foreground)" }}
                          placeholder="为什么做这笔交易？"
                          value={completeForm.reason}
                          onChange={(e) => setCompleteForm((p) => ({ ...p, reason: e.target.value }))}
                        />
                      </div>

                      {/* Basis */}
                      <div>
                        <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--muted-foreground)" }}>
                          决策依据 * <span className="font-normal">（可多选）</span>
                        </label>
                        <div className="space-y-2">
                          <p className="text-[11px]" style={{ color: "var(--brand-green)" }}>理性依据</p>
                          <div className="flex flex-wrap gap-1.5">
                            {RATIONAL_BASIS.map((b) => {
                              const selected = completeForm.basis.includes(b);
                              return (
                                <button key={b} type="button"
                                  onClick={() => setCompleteForm((p) => ({
                                    ...p,
                                    basis: selected ? p.basis.filter((x) => x !== b) : [...p.basis, b],
                                  }))}
                                  className="text-[11px] px-2 py-1 rounded transition-colors"
                                  style={{
                                    backgroundColor: selected ? "rgba(34,197,94,0.15)" : "var(--surface-overlay)",
                                    color: selected ? "var(--brand-green)" : "var(--muted-foreground)",
                                    border: `1px solid ${selected ? "rgba(34,197,94,0.4)" : "var(--border-subtle)"}`,
                                  }}
                                >{b}</button>
                              );
                            })}
                          </div>
                          <p className="text-[11px]" style={{ color: "var(--brand-red)" }}>非理性依据</p>
                          <div className="flex flex-wrap gap-1.5">
                            {IRRATIONAL_BASIS.map((b) => {
                              const selected = completeForm.basis.includes(b);
                              return (
                                <button key={b} type="button"
                                  onClick={() => setCompleteForm((p) => ({
                                    ...p,
                                    basis: selected ? p.basis.filter((x) => x !== b) : [...p.basis, b],
                                  }))}
                                  className="text-[11px] px-2 py-1 rounded transition-colors"
                                  style={{
                                    backgroundColor: selected ? "rgba(239,68,68,0.15)" : "var(--surface-overlay)",
                                    color: selected ? "var(--brand-red)" : "var(--muted-foreground)",
                                    border: `1px solid ${selected ? "rgba(239,68,68,0.4)" : "var(--border-subtle)"}`,
                                  }}
                                >{b}</button>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* System alignment */}
                      <div>
                        <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--muted-foreground)" }}>
                          符合交易体系
                        </label>
                        <div className="flex gap-2">
                          {(Object.entries(ALIGNMENT_LABELS) as [keyof typeof ALIGNMENT_LABELS, string][]).map(([k, v]) => {
                            const colors: Record<string, string> = { ALIGN: "var(--brand-green)", PARTIAL: "var(--brand-warning)", NOT_ALIGN: "var(--brand-red)" };
                            const selected = completeForm.systemAlignment === k;
                            return (
                              <button key={k} type="button"
                                onClick={() => setCompleteForm((p) => ({ ...p, systemAlignment: k }))}
                                className="flex-1 text-xs py-1.5 rounded-md transition-colors"
                                style={{
                                  backgroundColor: selected ? `${colors[k]}22` : "var(--surface-overlay)",
                                  color: selected ? colors[k] : "var(--muted-foreground)",
                                  border: `1px solid ${selected ? `${colors[k]}55` : "var(--border-subtle)"}`,
                                }}
                              >{v}</button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Scores */}
                      <div className="grid grid-cols-3 gap-3">
                        {(["calmScore", "confidenceScore", "fomoScore"] as const).map((key) => {
                          const labels: Record<string, string> = { calmScore: "平静度", confidenceScore: "信心度", fomoScore: "FOMO" };
                          return (
                            <div key={key}>
                              <label className="text-xs block mb-1.5" style={{ color: "var(--muted-foreground)" }}>
                                {labels[key]} <span style={{ color: "var(--foreground)" }}>{completeForm[key]}</span>
                              </label>
                              <input type="range" min={1} max={10}
                                value={completeForm[key]}
                                onChange={(e) => setCompleteForm((p) => ({ ...p, [key]: Number(e.target.value) }))}
                                className="w-full"
                              />
                            </div>
                          );
                        })}
                      </div>

                      {/* Stop loss — hidden for sell actions */}
                      {["SELL", "REDUCE", "CLEAR"].includes(decision.action) ? (
                        <div
                          className="px-3 py-2 rounded-md text-xs"
                          style={{ backgroundColor: "var(--surface-overlay)", color: "var(--muted-foreground)" }}
                        >
                          卖出操作无需预设止损，已自动跳过
                        </div>
                      ) : (
                        <div>
                          <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--muted-foreground)" }}>
                            止损价格 * <span className="font-normal">（入场价 ¥{decision.price}）</span>
                          </label>
                          <input
                            type="number"
                            autoComplete="off"
                            className="w-full h-9 px-3 rounded-md text-sm border"
                            style={{ backgroundColor: "var(--surface-base)", borderColor: "var(--border-subtle)", color: "var(--foreground)" }}
                            placeholder={`建议 ¥${(decision.price * 0.92).toFixed(2)}`}
                            value={completeForm.stopLossPrice}
                            onChange={(e) => setCompleteForm((p) => ({ ...p, stopLossPrice: e.target.value }))}
                          />
                        </div>
                      )}

                      {completeError && (
                        <p className="text-xs" style={{ color: "var(--brand-red)" }}>{completeError}</p>
                      )}

                      <button
                        type="button"
                        onClick={handleComplete}
                        disabled={completeLoading}
                        className="w-full h-10 rounded-lg text-sm font-medium text-white transition-opacity disabled:opacity-50"
                        style={{ backgroundColor: "var(--brand-blue)" }}
                      >
                        {completeLoading ? "保存中…" : "完成补全"}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Status banners */}
              {isVoided && (
                <div
                  className="flex items-start gap-2 px-4 py-3 rounded-lg border"
                  style={{ backgroundColor: "rgba(148,163,184,0.07)", borderColor: "rgba(148,163,184,0.3)" }}
                >
                  <Ban size={15} className="shrink-0 mt-0.5" style={{ color: "var(--muted-foreground)" }} />
                  <div>
                    <p className="text-sm font-medium" style={{ color: "var(--muted-foreground)" }}>
                      此决策已作废
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>
                      {decision.voidedReason && VOIDED_REASON_LABELS[decision.voidedReason]}
                      {decision.voidedAt && ` · ${dayjs(decision.voidedAt).format("MM/DD HH:mm")}`}
                    </p>
                  </div>
                </div>
              )}
              {isArchived && (
                <div
                  className="flex items-start gap-2 px-4 py-3 rounded-lg border"
                  style={{ backgroundColor: "rgba(148,163,184,0.07)", borderColor: "rgba(148,163,184,0.3)" }}
                >
                  <Archive size={15} className="shrink-0 mt-0.5" style={{ color: "var(--muted-foreground)" }} />
                  <div>
                    <p className="text-sm font-medium" style={{ color: "var(--muted-foreground)" }}>
                      此决策已归档
                    </p>
                  </div>
                </div>
              )}

              {/* Header */}
              <div className="flex items-start gap-3">
                <span
                  className="text-[11px] font-bold px-2 py-0.5 rounded shrink-0 mt-0.5"
                  style={{
                    backgroundColor: `${actionColor}22`,
                    color: actionColor,
                    opacity: isVoided ? 0.5 : 1,
                  }}
                >
                  {ACTION_LABELS[decision.action]}
                </span>
                <div>
                  <h2
                    className="text-lg font-bold"
                    style={{
                      color: "var(--foreground)",
                      textDecoration: isVoided ? "line-through" : "none",
                      opacity: isVoided ? 0.5 : 1,
                    }}
                  >
                    {decision.stockName}
                    <span className="text-sm font-normal ml-2" style={{ color: "var(--muted-foreground)" }}>
                      {decision.stockCode}
                    </span>
                  </h2>
                  <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>
                    {dayjs(decision.tradedAt ?? decision.createdAt).format("YYYY年MM月DD日 HH:mm")}
                  </p>
                  {hasParent && (
                    <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>
                      关联父卡：{decision.parentId?.slice(0, 8)}…
                    </p>
                  )}
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

              {/* Action buttons (ACTIVE only) */}
              {isActive && (
                <div
                  className="rounded-xl border p-4 space-y-3"
                  style={{ backgroundColor: "var(--surface-card)", borderColor: "var(--border-subtle)" }}
                >
                  <h3 className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>
                    操作
                  </h3>

                  {showVoidConfirm ? (
                    <div className="space-y-3">
                      <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                        {canVoidWithoutReason
                          ? "确认作废此决策？作废后不计入统计。"
                          : "此决策已超过 30 分钟，请选择作废原因："}
                      </p>
                      {!canVoidWithoutReason && (
                        <div className="flex flex-wrap gap-2">
                          {(Object.keys(VOIDED_REASON_LABELS) as VoidedReason[]).map((r) => (
                            <button
                              key={r}
                              type="button"
                              onClick={() => setVoidReason(r)}
                              className="text-xs px-3 py-1.5 rounded-full transition-colors"
                              style={{
                                backgroundColor: voidReason === r ? "rgba(148,163,184,0.15)" : "var(--surface-overlay)",
                                color: voidReason === r ? "var(--foreground)" : "var(--muted-foreground)",
                                border: `1px solid ${voidReason === r ? "var(--border-strong)" : "var(--border-subtle)"}`,
                              }}
                            >
                              {VOIDED_REASON_LABELS[r]}
                            </button>
                          ))}
                        </div>
                      )}
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setShowVoidConfirm(false)}
                          className="flex-1 h-9 rounded-lg text-xs font-medium transition-colors"
                          style={{
                            backgroundColor: "var(--surface-overlay)",
                            color: "var(--foreground)",
                            border: "1px solid var(--border-subtle)",
                          }}
                        >
                          取消
                        </button>
                        <button
                          type="button"
                          onClick={handleVoid}
                          disabled={actionLoading === "void"}
                          className="flex-1 h-9 rounded-lg text-xs font-medium text-white transition-colors disabled:opacity-50"
                          style={{ backgroundColor: "var(--brand-red)" }}
                        >
                          {actionLoading === "void" ? "处理中…" : "确认作废"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {isBuy && (
                        <>
                          <OperationLink
                            decision={decision}
                            action="ADD"
                            label="加仓"
                            icon={<TrendingUp size={13} />}
                            color="var(--color-up)"
                          />
                          <OperationLink
                            decision={decision}
                            action="REDUCE"
                            label="减仓"
                            icon={<TrendingDown size={13} />}
                            color="var(--color-down)"
                          />
                          <OperationLink
                            decision={decision}
                            action="CLEAR"
                            label="清仓"
                            icon={<TrendingDown size={13} />}
                            color="var(--color-down)"
                          />
                        </>
                      )}
                      <button
                        type="button"
                        onClick={() => setShowVoidConfirm(true)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity hover:opacity-80"
                        style={{
                          color: "var(--muted-foreground)",
                          backgroundColor: "var(--surface-overlay)",
                          border: "1px solid var(--border-subtle)",
                        }}
                      >
                        <Ban size={13} />
                        作废
                      </button>
                      <button
                        type="button"
                        onClick={handleArchive}
                        disabled={actionLoading === "archive"}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity hover:opacity-80 disabled:opacity-50"
                        style={{
                          color: "var(--muted-foreground)",
                          backgroundColor: "var(--surface-overlay)",
                          border: "1px solid var(--border-subtle)",
                        }}
                      >
                        <Archive size={13} />
                        {actionLoading === "archive" ? "处理中…" : "归档"}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
    </div>
  );  /* end sharedBody */

  /* ── Panel mode: inline, no backdrop ─────────────────────────────── */
  if (variant === "panel") {
    return (
      <div
        role="dialog"
        aria-labelledby="decision-sheet-title"
        className="h-full flex flex-col overflow-hidden"
        style={{ backgroundColor: "var(--surface-base)" }}
      >
        {sharedHeader}
        {sharedBody}
      </div>
    );
  }

  /* ── Sheet mode (default): portal → document.body, bypasses any CSS transform context ── */
  return createPortal(
    <>
      <div
        className="fixed inset-0 z-40"
        style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="decision-sheet-title"
        className="fixed right-0 top-0 bottom-0 z-50 flex flex-col overflow-hidden"
        style={{
          width: "min(580px, 100vw)",
          backgroundColor: "var(--surface-base)",
          borderLeft: "1px solid var(--border-subtle)",
          boxShadow: "-8px 0 32px rgba(0,0,0,0.3)",
        }}
      >
        {sharedHeader}
        {sharedBody}
      </div>
    </>,
    document.body
  );
}

function OperationLink({
  decision, action, label, icon, color,
}: {
  decision: Decision;
  action: "ADD" | "REDUCE" | "CLEAR";
  label: string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <Link
      href={`/decisions/new?parentId=${decision.id}&stockCode=${decision.stockCode}&stockName=${encodeURIComponent(decision.stockName)}&stockMarket=${decision.stockMarket}&action=${action}`}
      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity hover:opacity-80"
      style={{ backgroundColor: `${color}18`, color, border: `1px solid ${color}33` }}
    >
      {icon}
      {label}
    </Link>
  );
}
