"use client";

import { useState } from "react";
import { AlertCircle, X, Plus } from "lucide-react";

type ErrorTypeOption = {
  id: string;
  name: string;
  description: string;
  isPreset: boolean;
};

type ErrorLogEntry = {
  id: string;
  errorTypeId: string;
  errorTypeName: string;
  note: string;
  cost: number | null;
};

type Props = {
  decisionId: string;
  decisionAmount: number;
  return30Days: number | null;
  initialLogs: ErrorLogEntry[];
  allErrorTypes: ErrorTypeOption[];
};

export function ErrorTagger({
  decisionId,
  decisionAmount,
  return30Days,
  initialLogs,
  allErrorTypes,
}: Props) {
  const [logs, setLogs] = useState<ErrorLogEntry[]>(initialLogs);
  const [showPicker, setShowPicker] = useState(false);
  const [saving, setSaving] = useState(false);

  // 自动计算亏损金额（仅在 return30Days < 0 时有意义）
  const autoCost =
    return30Days !== null && return30Days < 0
      ? +(decisionAmount * (return30Days / 100)).toFixed(2)
      : null;

  async function addError(errorTypeId: string, errorTypeName: string) {
    if (logs.some((l) => l.errorTypeId === errorTypeId)) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/decisions/${decisionId}/errors`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ errorTypeId, cost: autoCost }),
      });
      if (res.ok) {
        const log = await res.json() as ErrorLogEntry;
        setLogs((prev) => [...prev, { ...log, errorTypeName }]);
      }
    } finally {
      setSaving(false);
      setShowPicker(false);
    }
  }

  async function removeError(logId: string) {
    setSaving(true);
    try {
      await fetch(`/api/decisions/${decisionId}/errors?logId=${logId}`, {
        method: "DELETE",
      });
      setLogs((prev) => prev.filter((l) => l.id !== logId));
    } finally {
      setSaving(false);
    }
  }

  const available = allErrorTypes.filter(
    (t) => !logs.some((l) => l.errorTypeId === t.id)
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <AlertCircle size={14} style={{ color: "var(--brand-red)" }} />
        <h2
          className="text-xs font-medium uppercase tracking-wider"
          style={{ color: "var(--muted-foreground)" }}
        >
          错误标记
        </h2>
        {autoCost !== null && (
          <span
            className="text-[10px] px-1.5 py-0.5 rounded"
            style={{ backgroundColor: "rgba(239,68,68,0.1)", color: "var(--brand-red)" }}
          >
            此笔亏损 ¥{Math.abs(autoCost).toLocaleString()}
          </span>
        )}
      </div>

      {/* Current tags */}
      <div className="flex flex-wrap gap-2">
        {logs.map((log) => (
          <span
            key={log.id}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium"
            style={{
              backgroundColor: "rgba(239,68,68,0.1)",
              color: "var(--brand-red)",
              border: "1px solid rgba(239,68,68,0.25)",
            }}
          >
            {log.errorTypeName}
            <button
              type="button"
              onClick={() => removeError(log.id)}
              disabled={saving}
              className="opacity-60 hover:opacity-100 transition-opacity"
            >
              <X size={11} />
            </button>
          </span>
        ))}

        {/* Add button */}
        {available.length > 0 && !showPicker && (
          <button
            type="button"
            onClick={() => setShowPicker(true)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs transition-colors"
            style={{
              backgroundColor: "var(--surface-overlay)",
              color: "var(--muted-foreground)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <Plus size={11} />
            标记错误
          </button>
        )}

        {logs.length === 0 && !showPicker && (
          <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
            无标记 · 点击"标记错误"将此笔归类到错误库
          </p>
        )}
      </div>

      {/* Error type picker */}
      {showPicker && (
        <div
          className="rounded-lg border p-3 space-y-1"
          style={{
            backgroundColor: "var(--surface-overlay)",
            borderColor: "var(--border-subtle)",
          }}
        >
          <p
            className="text-[11px] mb-2"
            style={{ color: "var(--muted-foreground)" }}
          >
            选择错误类型（可多次添加）
          </p>
          {available.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => addError(t.id, t.name)}
              disabled={saving}
              className="w-full flex items-start gap-2 px-3 py-2 rounded-md text-left transition-colors hover:bg-white/5"
            >
              <span
                className="text-xs font-medium shrink-0 mt-0.5"
                style={{ color: "var(--brand-red)" }}
              >
                {t.name}
              </span>
              <span className="text-[11px]" style={{ color: "var(--muted-foreground)" }}>
                {t.description}
              </span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => setShowPicker(false)}
            className="mt-1 text-[11px] px-2 py-1 rounded transition-colors"
            style={{ color: "var(--muted-foreground)" }}
          >
            取消
          </button>
        </div>
      )}
    </div>
  );
}
