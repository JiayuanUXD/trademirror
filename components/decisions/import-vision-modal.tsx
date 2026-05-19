"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { X, Upload, AlertTriangle, CheckCircle, Trash2, ChevronDown, Loader2 } from "lucide-react";
import type { RecognizedTrade } from "@/app/api/decisions/import-vision/route";
import { ACTION_LABELS, type DecisionAction } from "@/types/decision";

type EditableRow = RecognizedTrade & { _key: string };

type Step = "upload" | "processing" | "confirm" | "done";

function inferMarket(code: string): "SH" | "SZ" | "BJ" {
  if (/^6/.test(code)) return "SH";
  if (/^(00|30)/.test(code)) return "SZ";
  if (/^(43|83|87)/.test(code)) return "BJ";
  return "SH";
}

export function ImportVisionModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("upload");
  const [files, setFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [rows, setRows] = useState<EditableRow[]>([]);
  const [apiErrors, setApiErrors] = useState<{ imageIndex: number; reason: string }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdCount, setCreatedCount] = useState(0);
  const [processError, setProcessError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const MARKET_OPTIONS = [
    { value: "SH", label: "沪" },
    { value: "SZ", label: "深" },
    { value: "BJ", label: "北" },
  ];

  const handleFiles = useCallback((incoming: FileList | File[]) => {
    const valid = Array.from(incoming).filter((f) =>
      ["image/jpeg", "image/png", "image/webp"].includes(f.type)
    );
    setFiles((prev) => {
      const combined = [...prev, ...valid].slice(0, 5);
      return combined;
    });
  }, []);

  function removeFile(idx: number) {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleProcess() {
    if (files.length === 0) return;
    setStep("processing");
    setProcessError(null);

    const fd = new FormData();
    files.forEach((f) => fd.append("files", f));

    try {
      const res = await fetch("/api/decisions/import-vision", {
        method: "POST",
        body: fd,
      });

      if (!res.ok) {
        const data = await res.json() as { error?: string };
        setProcessError(data.error ?? "识别失败，请重试");
        setStep("upload");
        return;
      }

      const data = await res.json() as { trades: RecognizedTrade[]; errors: typeof apiErrors };
      setApiErrors(data.errors ?? []);

      if (data.trades.length === 0 && (data.errors?.length ?? 0) === files.length) {
        const firstReason = data.errors?.[0]?.reason;
        setProcessError(firstReason ? `识别失败：${firstReason}` : "所有图片均识别失败，请尝试更清晰的截图");
        setStep("upload");
        return;
      }

      setRows(
        data.trades.map((t, i) => ({
          ...t,
          _key: `${t.stockCode}-${i}-${Date.now()}`,
        }))
      );
      setStep("confirm");
    } catch (err) {
      setProcessError(err instanceof Error ? err.message : "网络错误，请重试");
      setStep("upload");
    }
  }

  function updateRow(key: string, patch: Partial<EditableRow>) {
    setRows((prev) => prev.map((r) => (r._key === key ? { ...r, ...patch } : r)));
  }

  function deleteRow(key: string) {
    setRows((prev) => prev.filter((r) => r._key !== key));
  }

  async function handleSubmit() {
    if (rows.length === 0) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/decisions/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trades: rows.map((r) => ({
            stockCode: r.stockCode,
            stockName: r.stockName,
            stockMarket: inferMarket(r.stockCode),
            action: r.action,
            price: r.price,
            quantity: r.quantity,
            tradedAt: r.tradedAt ?? null,
          })),
        }),
      });

      const data = await res.json() as { created: unknown[]; failed: unknown[] };
      setCreatedCount(data.created?.length ?? 0);
      setStep("done");
      router.refresh();
    } catch {
      setProcessError("提交失败，请重试");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-0 sm:px-4"
      style={{ backgroundColor: "rgba(0,0,0,0.65)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full sm:max-w-2xl rounded-t-2xl sm:rounded-2xl flex flex-col overflow-hidden"
        style={{
          backgroundColor: "var(--surface-base)",
          border: "1px solid var(--border-subtle)",
          maxHeight: "90vh",
          boxShadow: "0 24px 64px rgba(0,0,0,0.4)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 shrink-0"
          style={{ borderBottom: "1px solid var(--border-subtle)" }}
        >
          <div>
            <p className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
              📸 截图批量导入
            </p>
            <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>
              {step === "upload" && "上传交易记录截图，AI 自动识别"}
              {step === "processing" && "正在识别，请稍候…"}
              {step === "confirm" && `识别到 ${rows.length} 条记录，请确认后创建`}
              {step === "done" && `已创建 ${createdCount} 张决策卡草稿`}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="关闭"
            className="flex items-center justify-center w-8 h-8 rounded-lg transition-opacity hover:opacity-70"
            style={{ color: "var(--muted-foreground)", backgroundColor: "var(--surface-overlay)" }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">

          {/* ── Upload step ── */}
          {step === "upload" && (
            <div className="p-5 space-y-4">
              {processError && (
                <div
                  className="flex items-start gap-2 px-4 py-3 rounded-lg text-sm"
                  style={{
                    backgroundColor: "rgba(239,68,68,0.08)",
                    border: "1px solid rgba(239,68,68,0.2)",
                    color: "var(--brand-red)",
                  }}
                >
                  <AlertTriangle size={15} className="shrink-0 mt-0.5" />
                  {processError}
                </div>
              )}

              {/* Drop zone */}
              <div
                className="rounded-xl border-2 border-dashed flex flex-col items-center justify-center py-10 gap-3 cursor-pointer transition-colors"
                style={{
                  borderColor: dragOver ? "var(--brand-blue)" : "var(--border-subtle)",
                  backgroundColor: dragOver ? "rgba(61,142,248,0.05)" : "var(--surface-card)",
                }}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  if (e.dataTransfer.files) handleFiles(e.dataTransfer.files);
                }}
              >
                <Upload size={24} style={{ color: "var(--brand-blue)" }} />
                <div className="text-center">
                  <p className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
                    点击或拖拽上传截图
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>
                    支持 JPG / PNG / WEBP，最多 5 张，每张 ≤ 10MB
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  className="hidden"
                  onChange={(e) => e.target.files && handleFiles(e.target.files)}
                />
              </div>

              {/* File list */}
              {files.length > 0 && (
                <div className="space-y-2">
                  {files.map((f, i) => (
                    <div
                      key={`${f.name}-${i}`}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg"
                      style={{ backgroundColor: "var(--surface-card)", border: "1px solid var(--border-subtle)" }}
                    >
                      <div
                        className="w-8 h-8 rounded-md shrink-0 overflow-hidden"
                        style={{ backgroundColor: "var(--surface-overlay)" }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={URL.createObjectURL(f)}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <span className="flex-1 text-xs truncate" style={{ color: "var(--foreground)" }}>
                        {f.name}
                      </span>
                      <span className="text-xs shrink-0" style={{ color: "var(--muted-foreground)" }}>
                        {(f.size / 1024).toFixed(0)} KB
                      </span>
                      <button
                        onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                        className="text-xs transition-opacity hover:opacity-70 shrink-0"
                        style={{ color: "var(--muted-foreground)" }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Tips */}
              <div
                className="rounded-lg px-4 py-3 space-y-1"
                style={{ backgroundColor: "var(--surface-card)", border: "1px solid var(--border-subtle)" }}
              >
                <p className="text-xs font-medium" style={{ color: "var(--foreground)" }}>截图建议</p>
                <ul className="text-xs space-y-0.5" style={{ color: "var(--muted-foreground)" }}>
                  <li>• 东方财富 / 同花顺 / 华泰证券 的成交记录页</li>
                  <li>• 确保股票代码、名称、价格、数量清晰可见</li>
                  <li>• 避免截图模糊、截断或有遮挡</li>
                </ul>
              </div>
            </div>
          )}

          {/* ── Processing step ── */}
          {step === "processing" && (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 size={32} className="animate-spin" style={{ color: "var(--brand-blue)" }} />
              <div className="text-center">
                <p className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
                  AI 正在识别交易记录
                </p>
                <p className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>
                  大约需要 5-15 秒，请勿关闭页面
                </p>
              </div>
            </div>
          )}

          {/* ── Confirm step ── */}
          {step === "confirm" && (
            <div className="p-5 space-y-4">
              {apiErrors.length > 0 && (
                <div
                  className="flex items-start gap-2 px-4 py-3 rounded-lg text-xs"
                  style={{
                    backgroundColor: "rgba(245,158,11,0.08)",
                    border: "1px solid rgba(245,158,11,0.2)",
                    color: "var(--brand-warning)",
                  }}
                >
                  <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                  <div>
                    {apiErrors.length} 张图片识别失败：
                    {apiErrors.map((e) => ` 图片${e.imageIndex + 1}（${e.reason}）`).join("；")}
                  </div>
                </div>
              )}

              {rows.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
                    未识别到有效交易记录，请重新上传
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                    点击各字段可直接编辑；橙色高亮表示识别置信度较低，请重点核查。
                  </p>
                  <div className="space-y-2">
                    {rows.map((row) => (
                      <ConfirmRow
                        key={row._key}
                        row={row}
                        onChange={(patch) => updateRow(row._key, patch)}
                        onDelete={() => deleteRow(row._key)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Done step ── */}
          {step === "done" && (
            <div className="flex flex-col items-center justify-center py-16 gap-4 px-5">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center"
                style={{ backgroundColor: "rgba(34,197,94,0.12)" }}
              >
                <CheckCircle size={28} style={{ color: "var(--brand-green)" }} />
              </div>
              <div className="text-center">
                <p className="text-base font-semibold" style={{ color: "var(--foreground)" }}>
                  已创建 {createdCount} 张决策卡草稿
                </p>
                <p className="text-sm mt-1.5" style={{ color: "var(--muted-foreground)" }}>
                  情绪评分、决策依据等字段尚未填写，请逐一补全
                </p>
              </div>
              <button
                onClick={onClose}
                className="px-5 py-2 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: "var(--brand-blue)" }}
              >
                去补全决策卡
              </button>
            </div>
          )}
        </div>

        {/* Footer actions */}
        {(step === "upload" || step === "confirm") && (
          <div
            className="px-5 py-4 flex gap-3 shrink-0"
            style={{ borderTop: "1px solid var(--border-subtle)" }}
          >
            {step === "upload" && (
              <>
                <button
                  onClick={onClose}
                  className="flex-1 h-10 rounded-lg text-sm font-medium transition-colors"
                  style={{
                    backgroundColor: "var(--surface-overlay)",
                    color: "var(--foreground)",
                    border: "1px solid var(--border-subtle)",
                  }}
                >
                  取消
                </button>
                <button
                  onClick={handleProcess}
                  disabled={files.length === 0}
                  className="flex-1 h-10 rounded-lg text-sm font-medium text-white transition-opacity disabled:opacity-40"
                  style={{ backgroundColor: "var(--brand-blue)" }}
                >
                  开始识别 {files.length > 0 ? `（${files.length} 张）` : ""}
                </button>
              </>
            )}

            {step === "confirm" && (
              <>
                <button
                  onClick={() => { setStep("upload"); setFiles([]); setRows([]); }}
                  className="flex-1 h-10 rounded-lg text-sm font-medium transition-colors"
                  style={{
                    backgroundColor: "var(--surface-overlay)",
                    color: "var(--foreground)",
                    border: "1px solid var(--border-subtle)",
                  }}
                >
                  重新上传
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting || rows.length === 0}
                  className="flex-1 h-10 rounded-lg text-sm font-medium text-white transition-opacity disabled:opacity-40"
                  style={{ backgroundColor: "var(--brand-blue)" }}
                >
                  {isSubmitting ? "创建中…" : `确认创建 ${rows.length} 张决策卡`}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Editable confirm row ─────────────────────────────────────────────────────

function ConfirmRow({
  row,
  onChange,
  onDelete,
}: {
  row: EditableRow;
  onChange: (patch: Partial<EditableRow>) => void;
  onDelete: () => void;
}) {
  const lowConfidence = row.confidence < 0.7;
  const isBuy = row.action === "BUY" || row.action === "ADD";
  const actionColor = isBuy ? "var(--color-up)" : "var(--color-down)";

  return (
    <div
      className="rounded-xl border p-3 space-y-2.5"
      style={{
        backgroundColor: "var(--surface-card)",
        borderColor: lowConfidence ? "rgba(245,158,11,0.4)" : "var(--border-subtle)",
      }}
    >
      {lowConfidence && (
        <div className="flex items-center gap-1.5 text-[11px]" style={{ color: "var(--brand-warning)" }}>
          <AlertTriangle size={11} />
          识别置信度较低（{Math.round(row.confidence * 100)}%），请仔细核查
        </div>
      )}

      {/* Row 1: stock + action + delete */}
      <div className="flex items-center gap-2">
        {/* Stock code */}
        <input
          className="w-20 h-8 px-2 rounded-md text-xs font-mono border text-center"
          style={{
            backgroundColor: "var(--surface-overlay)",
            borderColor: "var(--border-subtle)",
            color: "var(--brand-blue)",
          }}
          value={row.stockCode}
          maxLength={6}
          onChange={(e) => onChange({ stockCode: e.target.value })}
          placeholder="代码"
        />

        {/* Stock name */}
        <input
          className="flex-1 h-8 px-2 rounded-md text-xs border"
          style={{
            backgroundColor: "var(--surface-overlay)",
            borderColor: "var(--border-subtle)",
            color: "var(--foreground)",
          }}
          value={row.stockName}
          onChange={(e) => onChange({ stockName: e.target.value })}
          placeholder="名称"
        />

        {/* Action select */}
        <div className="relative shrink-0">
          <select
            className="h-8 pl-2 pr-6 rounded-md text-xs font-bold border appearance-none cursor-pointer"
            style={{
              backgroundColor: `${actionColor}18`,
              borderColor: `${actionColor}44`,
              color: actionColor,
            }}
            value={row.action}
            onChange={(e) => onChange({ action: e.target.value as DecisionAction })}
          >
            {(Object.keys(ACTION_LABELS) as DecisionAction[]).map((a) => (
              <option key={a} value={a}>{ACTION_LABELS[a]}</option>
            ))}
          </select>
          <ChevronDown size={11} className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: actionColor }} />
        </div>

        {/* Delete */}
        <button
          onClick={onDelete}
          className="flex items-center justify-center w-8 h-8 rounded-lg transition-opacity hover:opacity-70 shrink-0"
          style={{ color: "var(--muted-foreground)", backgroundColor: "var(--surface-overlay)" }}
        >
          <Trash2 size={13} />
        </button>
      </div>

      {/* Row 2: price + quantity + time */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 flex-1">
          <span className="text-[11px] shrink-0" style={{ color: "var(--muted-foreground)" }}>价格</span>
          <input
            type="number"
            min="0"
            step="0.01"
            className="flex-1 h-8 px-2 rounded-md text-xs border"
            style={{
              backgroundColor: "var(--surface-overlay)",
              borderColor: "var(--border-subtle)",
              color: "var(--foreground)",
            }}
            value={row.price}
            onChange={(e) => onChange({ price: parseFloat(e.target.value) || 0 })}
          />
        </div>
        <div className="flex items-center gap-1 flex-1">
          <span className="text-[11px] shrink-0" style={{ color: "var(--muted-foreground)" }}>数量</span>
          <input
            type="number"
            min="100"
            step="100"
            className="flex-1 h-8 px-2 rounded-md text-xs border"
            style={{
              backgroundColor: "var(--surface-overlay)",
              borderColor: "var(--border-subtle)",
              color: "var(--foreground)",
            }}
            value={row.quantity}
            onChange={(e) => onChange({ quantity: parseInt(e.target.value) || 0 })}
          />
        </div>
        <div className="flex items-center gap-1 min-w-0" style={{ flex: "1.5" }}>
          <span className="text-[11px] shrink-0" style={{ color: "var(--muted-foreground)" }}>时间</span>
          <input
            type="datetime-local"
            className="flex-1 h-8 px-2 rounded-md text-[11px] border min-w-0"
            style={{
              backgroundColor: "var(--surface-overlay)",
              borderColor: "var(--border-subtle)",
              color: "var(--foreground)",
            }}
            value={row.tradedAt ? row.tradedAt.slice(0, 16) : ""}
            onChange={(e) => onChange({ tradedAt: e.target.value || null })}
          />
        </div>
      </div>
    </div>
  );
}
