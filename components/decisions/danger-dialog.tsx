"use client";

import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { AlertTriangle, ShieldAlert, X } from "lucide-react";
import type { DangerAlert } from "@/app/api/decisions/pre-check/route";
import type { GuardrailHit } from "@/lib/guardrails";

type Props = {
  open: boolean;
  alerts: DangerAlert[];
  guardrails?: GuardrailHit[];
  onConfirm: () => void;
  onCancel: () => void;
  onWatchlist?: () => void;
  isSubmitting?: boolean;
};

export function DangerDialog({
  open,
  alerts,
  guardrails = [],
  onConfirm,
  onCancel,
  onWatchlist,
  isSubmitting = false,
}: Props) {
  const hasCalmAlert = alerts.some((a) => a.signal === "CALM_LOW");
  const blockingHits = guardrails.filter((g) => g.blocking);
  const warningHits = guardrails.filter((g) => !g.blocking);
  const isBlocked = blockingHits.length > 0;
  const totalCount = alerts.length + guardrails.length;
  const titleText = isBlocked
    ? `禁止保存 · ${blockingHits.length} 条硬约束`
    : `等等。检测到 ${totalCount} 个危险信号`;
  const subtitle = isBlocked
    ? "调整决策卡内容直至硬约束清除，再试一次"
    : "看完你自己的历史数据，再决定是否继续";

  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onCancel();
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop
          className="fixed inset-0 z-50 bg-[#0B0F15]/90 backdrop-blur-xl data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0 transition-all duration-300"
        />
        <DialogPrimitive.Popup
          className="fixed top-1/2 left-1/2 z-50 w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 rounded-xl outline-none sm:max-w-md data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95"
          style={{
            backgroundColor: "var(--surface-card)",
            border: "1px solid var(--border-strong)",
            boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
          }}
        >
          {/* Header */}
          <div
            className="flex items-center gap-2.5 px-5 py-4 border-b"
            style={{ borderColor: "var(--border-subtle)" }}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
              style={{
                backgroundColor: isBlocked
                  ? "rgba(239,68,68,0.18)"
                  : "rgba(245,158,11,0.15)",
              }}
            >
              {isBlocked ? (
                <ShieldAlert size={16} style={{ color: "var(--brand-red)" }} />
              ) : (
                <AlertTriangle size={16} style={{ color: "var(--brand-warning)" }} />
              )}
            </div>
            <div className="flex-1">
              <DialogPrimitive.Title
                className="text-sm font-semibold"
                style={{ color: "var(--foreground)" }}
              >
                {titleText}
              </DialogPrimitive.Title>
              <DialogPrimitive.Description
                className="text-[11px] mt-0.5"
                style={{ color: "var(--muted-foreground)" }}
              >
                {subtitle}
              </DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close
              className="w-6 h-6 rounded-md flex items-center justify-center transition-colors hover:bg-white/5"
              style={{ color: "var(--muted-foreground)" }}
              aria-label="关闭"
            >
              <X size={14} />
            </DialogPrimitive.Close>
          </div>

          {/* Guardrail blocking hits（红色硬约束） */}
          {blockingHits.length > 0 && (
            <div className="px-5 pt-3 space-y-2.5">
              {blockingHits.map((g) => (
                <div
                  key={g.type}
                  className="rounded-lg px-3 py-2.5"
                  style={{
                    backgroundColor: "rgba(239,68,68,0.08)",
                    border: "1px solid rgba(239,68,68,0.3)",
                  }}
                >
                  <div className="text-xs font-semibold mb-1" style={{ color: "var(--brand-red)" }}>
                    🔒 {g.title}
                  </div>
                  <div className="text-xs leading-relaxed mb-1.5" style={{ color: "var(--foreground)" }}>
                    {g.message}
                  </div>
                  <div className="text-[11px] leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
                    {g.detail}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Guardrail warnings + 心理 alerts（黄色） */}
          <div className="px-5 py-3 space-y-2.5 max-h-[45vh] overflow-y-auto">
            {warningHits.map((g) => (
              <div
                key={g.type}
                className="rounded-lg px-3 py-2.5"
                style={{
                  backgroundColor: "rgba(245,158,11,0.06)",
                  border: "1px solid rgba(245,158,11,0.2)",
                }}
              >
                <div className="text-xs font-semibold mb-1" style={{ color: "var(--brand-warning)" }}>
                  {g.title}
                </div>
                <div className="text-xs leading-relaxed mb-1.5" style={{ color: "var(--foreground)" }}>
                  {g.message}
                </div>
                <div className="text-[11px] leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
                  {g.detail}
                </div>
              </div>
            ))}
            {alerts.map((a) => (
              <div
                key={a.signal}
                className="rounded-lg px-3 py-2.5"
                style={{
                  backgroundColor: "rgba(245,158,11,0.06)",
                  border: "1px solid rgba(245,158,11,0.2)",
                }}
              >
                <div className="text-xs font-semibold mb-1" style={{ color: "var(--brand-warning)" }}>
                  {a.title}
                </div>
                <div className="text-xs leading-relaxed mb-1.5" style={{ color: "var(--foreground)" }}>
                  {a.message}
                </div>
                {a.history && (
                  <div className="text-[11px] leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
                    {a.history}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t space-y-2" style={{ borderColor: "var(--border-subtle)" }}>
            {hasCalmAlert && onWatchlist && !isBlocked && (
              <button
                type="button"
                onClick={onWatchlist}
                disabled={isSubmitting}
                className="w-full h-9 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
                style={{
                  backgroundColor: "rgba(61,142,248,0.12)",
                  color: "var(--brand-blue)",
                  border: "1px solid rgba(61,142,248,0.3)",
                }}
              >
                先观察，明天再决定 →
              </button>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onCancel}
                disabled={isSubmitting}
                className="flex-1 h-9 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
                style={{
                  backgroundColor: "var(--surface-overlay)",
                  color: "var(--foreground)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                {isBlocked ? "返回修改" : "取消，再想想"}
              </button>
              {!isBlocked && (
                <button
                  type="button"
                  onClick={onConfirm}
                  disabled={isSubmitting}
                  className="flex-1 h-9 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
                  style={{
                    backgroundColor: "var(--brand-warning)",
                    color: "#0D1117",
                  }}
                >
                  {isSubmitting ? "提交中…" : "我知道了，继续"}
                </button>
              )}
            </div>
          </div>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

