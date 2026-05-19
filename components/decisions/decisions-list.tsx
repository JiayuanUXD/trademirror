"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus, AlertTriangle, TrendingUp, TrendingDown,
  Ban, Archive, Camera, PenLine, MoreHorizontal,
} from "lucide-react";
import { ACTION_LABELS, type DecisionAction, type DecisionStatus } from "@/types/decision";
import type { Decision, VoidedReason } from "@/types/decision";
import { VOIDED_REASON_LABELS } from "@/types/decision";
import { DecisionSheet } from "./decision-sheet";
import { ImportVisionModal } from "./import-vision-modal";
import dayjs from "dayjs";

const ACTION_COLORS: Record<DecisionAction, string> = {
  BUY:    "var(--color-up)",
  ADD:    "var(--color-up)",
  SELL:   "var(--color-down)",
  REDUCE: "var(--color-down)",
  CLEAR:  "var(--color-down)",
};

const STATUS_FILTERS: { value: DecisionStatus | "ALL"; label: string }[] = [
  { value: "ALL",      label: "全部" },
  { value: "ACTIVE",   label: "活跃" },
  { value: "VOIDED",   label: "已作废" },
  { value: "ARCHIVED", label: "已归档" },
];

type Props = { decisions: Decision[] };

export function DecisionsList({ decisions }: Props) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<DecisionStatus | "ALL">("ALL");
  const [showImportModal, setShowImportModal] = useState(false);
  // Tracks which row's "更多" dropdown is open
  const [openMoreId, setOpenMoreId] = useState<string | null>(null);

  const filtered = statusFilter === "ALL"
    ? decisions
    : decisions.filter((d) => d.status === statusFilter);

  const incompleteCount = decisions.filter((d) => d.incomplete && d.status === "ACTIVE").length;

  const handleActionDone = useCallback(() => {
    setOpenMoreId(null);
    router.refresh();
  }, [router]);

  return (
    <>
      {/* Incomplete banner */}
      {incompleteCount > 0 && (
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-xl"
          style={{ backgroundColor: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)" }}
        >
          <PenLine size={15} className="shrink-0" style={{ color: "var(--brand-warning)" }} />
          <p className="flex-1 text-xs" style={{ color: "var(--muted-foreground)" }}>
            <span className="font-semibold" style={{ color: "var(--brand-warning)" }}>{incompleteCount} 张</span>{" "}
            批量导入的决策卡尚未补全，点击"补全"按钮完善情绪评分和决策依据
          </p>
        </div>
      )}

      {/* Filter bar */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex gap-1.5 flex-wrap">
          {STATUS_FILTERS.map((f) => {
            const isActive = statusFilter === f.value;
            return (
              <button key={f.value} type="button" onClick={() => setStatusFilter(f.value)}
                className="text-xs px-3 py-1.5 rounded-full transition-colors"
                style={{
                  backgroundColor: isActive ? "var(--brand-blue)" : "var(--surface-overlay)",
                  color: isActive ? "#fff" : "var(--muted-foreground)",
                  border: `1px solid ${isActive ? "var(--brand-blue)" : "var(--border-subtle)"}`,
                }}>
                {f.label}
              </button>
            );
          })}
        </div>
        <button type="button" onClick={() => setShowImportModal(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity hover:opacity-80"
          style={{ backgroundColor: "var(--surface-overlay)", color: "var(--muted-foreground)", border: "1px solid var(--border-subtle)" }}>
          <Camera size={13} /> 截图导入
        </button>
      </div>

      {/* Empty states */}
      {filtered.length === 0 && decisions.length === 0 && (
        <div className="rounded-xl border flex flex-col items-center justify-center py-24 text-center"
          style={{ backgroundColor: "var(--surface-card)", borderColor: "var(--border-subtle)" }}>
          <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4"
            style={{ backgroundColor: "var(--brand-blue-dim)" }}>
            <Plus size={20} style={{ color: "var(--brand-blue)" }} />
          </div>
          <p className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>还没有决策卡</p>
          <p className="text-xs mt-1.5 mb-5" style={{ color: "var(--muted-foreground)" }}>在下单前先记录你的思考过程，这是最重要的习惯</p>
          <div className="flex gap-2">
            <Link href="/decisions/new"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white"
              style={{ backgroundColor: "var(--brand-blue)" }}>
              <Plus size={14} /> 创建决策卡
            </Link>
            <button type="button" onClick={() => setShowImportModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium"
              style={{ backgroundColor: "var(--surface-overlay)", color: "var(--foreground)", border: "1px solid var(--border-subtle)" }}>
              <Camera size={14} /> 截图导入
            </button>
          </div>
        </div>
      )}
      {filtered.length === 0 && decisions.length > 0 && (
        <div className="rounded-xl border flex items-center justify-center py-20"
          style={{ backgroundColor: "var(--surface-card)", borderColor: "var(--border-subtle)" }}>
          <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
            没有{STATUS_FILTERS.find((f) => f.value === statusFilter)?.label ?? ""}的决策卡
          </p>
        </div>
      )}

      {filtered.length > 0 && (
        <>
          {/* Mobile cards */}
          <div className="space-y-2 sm:hidden">
            {filtered.map((d) => (
              <DecisionCard key={d.id} d={d}
                onSelect={setSelectedId}
                onActionDone={handleActionDone}
              />
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden sm:block rounded-xl border overflow-hidden"
            style={{ borderColor: "var(--border-subtle)" }}>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr style={{ backgroundColor: "var(--surface-overlay)", borderBottom: "1px solid var(--border-subtle)" }}>
                  <Th>股票</Th>
                  <Th>价格 × 数量</Th>
                  <Th className="hidden md:table-cell">金额</Th>
                  <Th className="hidden lg:table-cell">情绪</Th>
                  <Th>信号</Th>
                  <Th className="hidden md:table-cell">收益</Th>
                  <Th>日期</Th>
                  <Th>操作</Th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((d, i) => (
                  <DecisionRow
                    key={d.id}
                    d={d}
                    isLast={i === filtered.length - 1}
                    onSelect={setSelectedId}
                    onActionDone={handleActionDone}
                    moreOpen={openMoreId === d.id}
                    onMoreToggle={(open) => setOpenMoreId(open ? d.id : null)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <DecisionSheet
        decisionId={selectedId}
        onClose={() => setSelectedId(null)}
        onDecisionChange={() => router.refresh()}
      />
      {showImportModal && (
        <ImportVisionModal onClose={() => { setShowImportModal(false); router.refresh(); }} />
      )}
    </>
  );
}

// ── Shared helpers ──────────────────────────────────────────────────────────

function Th({ children, className = "" }: { children?: React.ReactNode; className?: string }) {
  return (
    <th className={`px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider whitespace-nowrap ${className}`}
      style={{ color: "var(--muted-foreground)" }}>
      {children}
    </th>
  );
}

function ScoreChip({ value, invert = false, label }: { value: number; invert?: boolean; label: string }) {
  const bad = invert ? value >= 7 : value <= 4;
  const good = invert ? value < 5 : value >= 7;
  const color = bad ? "var(--brand-red)" : good ? "var(--brand-green)" : "var(--brand-warning)";
  return (
    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded font-mono text-[11px]"
      style={{ backgroundColor: `${color}18`, color }}>
      {label}{value}
    </span>
  );
}

// ── Operations: void / archive inline actions ────────────────────────────────

type ActionCallbacks = { onSelect: (id: string) => void; onActionDone: () => void };

async function doArchive(id: string): Promise<boolean> {
  const res = await fetch(`/api/decisions/${id}/archive`, { method: "PATCH" });
  return res.ok;
}

async function doVoid(id: string, reason: VoidedReason): Promise<boolean> {
  const res = await fetch(`/api/decisions/${id}/void`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason }),
  });
  return res.ok;
}

// Dropdown menu for secondary actions (作废 / 归档 etc.)
function MoreMenu({
  d,
  onClose,
  onSelect,
  onActionDone,
}: { d: Decision; onClose: () => void } & ActionCallbacks) {
  const ref = useRef<HTMLDivElement>(null);
  const [voidStep, setVoidStep] = useState(false);
  const [voidReason, setVoidReason] = useState<VoidedReason>("INPUT_ERROR");
  const [loading, setLoading] = useState<string | null>(null);

  const minutesSince = Math.floor((Date.now() - d.createdAt) / 60_000);
  const canVoidFree = minutesSince <= 30;
  const isBuy = d.action === "BUY" || d.action === "ADD";

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  function stop(e: React.MouseEvent) { e.stopPropagation(); }

  async function handleArchive(e: React.MouseEvent) {
    stop(e);
    setLoading("archive");
    if (await doArchive(d.id)) onActionDone();
    setLoading(null);
  }

  async function handleVoid(e: React.MouseEvent) {
    stop(e);
    if (canVoidFree) {
      setLoading("void");
      if (await doVoid(d.id, "INPUT_ERROR")) onActionDone();
      setLoading(null);
    } else {
      setVoidStep(true);
    }
  }

  async function handleVoidConfirm(e: React.MouseEvent) {
    stop(e);
    setLoading("void");
    if (await doVoid(d.id, voidReason)) onActionDone();
    setLoading(null);
  }

  const menuStyle: React.CSSProperties = {
    position: "absolute",
    right: 0,
    top: "calc(100% + 4px)",
    zIndex: 50,
    minWidth: 160,
    backgroundColor: "var(--surface-card)",
    border: "1px solid var(--border-subtle)",
    borderRadius: 10,
    boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
    padding: "6px",
  };

  const itemBase = "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors text-left";
  const itemStyle = { color: "var(--foreground)" };

  return (
    <div ref={ref} style={menuStyle} onClick={stop}>
      {voidStep ? (
        <div className="space-y-2 p-1">
          <p className="text-[11px] px-1" style={{ color: "var(--muted-foreground)" }}>选择作废原因：</p>
          {(Object.keys(VOIDED_REASON_LABELS) as VoidedReason[]).map((r) => (
            <button key={r} type="button"
              onClick={() => setVoidReason(r)}
              className={itemBase}
              style={{
                ...itemStyle,
                backgroundColor: voidReason === r ? "var(--surface-overlay)" : "transparent",
              }}>
              <span className="flex-1">{VOIDED_REASON_LABELS[r]}</span>
              {voidReason === r && <span style={{ color: "var(--brand-blue)" }}>✓</span>}
            </button>
          ))}
          <button type="button" onClick={handleVoidConfirm} disabled={loading === "void"}
            className="w-full py-1.5 rounded-lg text-xs font-medium text-white disabled:opacity-50"
            style={{ backgroundColor: "var(--brand-red)" }}>
            {loading === "void" ? "处理中…" : "确认作废"}
          </button>
        </div>
      ) : (
        <>
          {/* Navigation actions */}
          {isBuy && (
            <>
              <Link href={`/decisions/new?parentId=${d.id}&stockCode=${d.stockCode}&stockName=${encodeURIComponent(d.stockName)}&stockMarket=${d.stockMarket}&action=REDUCE`}
                className={itemBase} style={itemStyle}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "var(--surface-overlay)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"; }}>
                <TrendingDown size={13} style={{ color: "var(--color-down)" }} /> 减仓
              </Link>
              <Link href={`/decisions/new?parentId=${d.id}&stockCode=${d.stockCode}&stockName=${encodeURIComponent(d.stockName)}&stockMarket=${d.stockMarket}&action=CLEAR`}
                className={itemBase} style={itemStyle}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "var(--surface-overlay)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"; }}>
                <TrendingDown size={13} style={{ color: "var(--color-down)" }} /> 清仓
              </Link>
              <div style={{ height: 1, backgroundColor: "var(--border-subtle)", margin: "4px 0" }} />
            </>
          )}
          <button type="button" onClick={handleVoid} disabled={loading === "void"}
            className={itemBase + " disabled:opacity-50"}
            style={{ ...itemStyle, color: "var(--muted-foreground)" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "var(--surface-overlay)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"; }}>
            <Ban size={13} /> {loading === "void" ? "处理中…" : "作废"}
          </button>
          <button type="button" onClick={handleArchive} disabled={loading === "archive"}
            className={itemBase + " disabled:opacity-50"}
            style={{ ...itemStyle, color: "var(--muted-foreground)" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "var(--surface-overlay)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"; }}>
            <Archive size={13} /> {loading === "archive" ? "处理中…" : "归档"}
          </button>
        </>
      )}
    </div>
  );
}

// The operations cell for desktop table rows
function OperationsCell({
  d,
  moreOpen,
  onMoreToggle,
  onSelect,
  onActionDone,
}: { d: Decision; moreOpen: boolean; onMoreToggle: (open: boolean) => void } & ActionCallbacks) {
  const isActive = d.status === "ACTIVE";
  const isIncomplete = d.incomplete && isActive;
  const isBuy = d.action === "BUY" || d.action === "ADD";

  function stop(e: React.MouseEvent) { e.stopPropagation(); }

  const btnBase = "inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-opacity hover:opacity-80 whitespace-nowrap";

  if (!isActive) {
    return (
      <td className="px-4 py-3">
        <span style={{ color: "var(--border-subtle)", fontSize: 11 }}>—</span>
      </td>
    );
  }

  return (
    <td className="px-4 py-3" onClick={stop}>
      <div className="flex items-center gap-1.5 relative">
        {/* Primary: 补全 */}
        {isIncomplete && (
          <button type="button"
            onClick={() => onSelect(d.id)}
            className={btnBase}
            style={{ backgroundColor: "rgba(245,158,11,0.12)", color: "var(--brand-warning)", border: "1px solid rgba(245,158,11,0.3)" }}>
            <PenLine size={11} /> 补全
          </button>
        )}

        {/* Primary: 加仓 (BUY/ADD active non-incomplete) */}
        {isBuy && !isIncomplete && (
          <Link
            href={`/decisions/new?parentId=${d.id}&stockCode=${d.stockCode}&stockName=${encodeURIComponent(d.stockName)}&stockMarket=${d.stockMarket}&action=ADD`}
            className={btnBase}
            style={{ backgroundColor: "rgba(var(--color-up-rgb, 239,68,68),0.08)", color: "var(--color-up)", border: "1px solid rgba(var(--color-up-rgb,239,68,68),0.2)" }}
            onClick={stop}>
            <TrendingUp size={11} /> 加仓
          </Link>
        )}

        {/* Secondary: 更多 */}
        <div className="relative">
          <button
            type="button"
            onClick={(e) => { stop(e); onMoreToggle(!moreOpen); }}
            className="inline-flex items-center justify-center w-7 h-7 rounded-md transition-colors"
            style={{
              backgroundColor: moreOpen ? "var(--surface-overlay)" : "transparent",
              color: "var(--muted-foreground)",
              border: "1px solid var(--border-subtle)",
            }}>
            <MoreHorizontal size={13} />
          </button>
          {moreOpen && (
            <MoreMenu
              d={d}
              onClose={() => onMoreToggle(false)}
              onSelect={onSelect}
              onActionDone={onActionDone}
            />
          )}
        </div>
      </div>
    </td>
  );
}

// ── Desktop table row ─────────────────────────────────────────────────────

type RowProps = {
  d: Decision;
  isLast: boolean;
  moreOpen: boolean;
  onMoreToggle: (open: boolean) => void;
} & ActionCallbacks;

function DecisionRow({ d, isLast, moreOpen, onMoreToggle, onSelect, onActionDone }: RowProps) {
  const isVoided   = d.status === "VOIDED";
  const isArchived = d.status === "ARCHIVED";
  const isIncomplete = d.incomplete && d.status === "ACTIVE";
  const hasDanger = d.dangerSignals.length > 0;
  const hasResult = d.return30Days !== null;
  const color = ACTION_COLORS[d.action];

  const rowBg = isIncomplete ? "rgba(245,158,11,0.03)" : "var(--surface-card)";
  const rowHover = isIncomplete ? "rgba(245,158,11,0.07)" : "var(--surface-overlay)";

  return (
    <tr
      onClick={() => onSelect(d.id)}
      className="cursor-pointer transition-colors"
      style={{
        opacity: isVoided ? 0.45 : isArchived ? 0.6 : 1,
        borderBottom: isLast ? "none" : "1px solid var(--border-subtle)",
        backgroundColor: rowBg,
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = rowHover; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = rowBg; }}
    >
      {/* 股票 */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          {/* Action color bar */}
          <span
            className="w-1 h-8 rounded-full shrink-0"
            style={{ backgroundColor: isVoided || isArchived ? "var(--border-subtle)" : color }}
          />
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-sm font-medium"
                style={{ color: "var(--foreground)", textDecoration: isVoided ? "line-through" : "none" }}>
                {d.stockName}
              </span>
              <span className="text-[11px] font-mono" style={{ color: "var(--muted-foreground)" }}>
                {d.stockCode}
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded font-bold hidden lg:inline"
                style={{
                  backgroundColor: isVoided || isArchived ? "rgba(148,163,184,0.1)" : `${color}18`,
                  color: isVoided || isArchived ? "var(--muted-foreground)" : color,
                }}>
                {ACTION_LABELS[d.action]}
              </span>
            </div>
            <p className="text-[11px] mt-0.5 max-w-[200px] truncate hidden md:block"
              style={{ color: "var(--muted-foreground)" }}>
              {isIncomplete ? "待补全" : d.reason}
            </p>
          </div>
        </div>
      </td>

      {/* 价格 × 数量 */}
      <td className="px-4 py-3 tabular-nums text-sm whitespace-nowrap">
        <span style={{ color: isVoided || isArchived ? "var(--muted-foreground)" : color }}>
          ¥{d.price.toLocaleString()}
        </span>
        <span className="mx-1" style={{ color: "var(--muted-foreground)" }}>×</span>
        <span style={{ color: "var(--muted-foreground)" }}>{d.quantity.toLocaleString()}</span>
      </td>

      {/* 金额 (md+) */}
      <td className="px-4 py-3 tabular-nums text-sm whitespace-nowrap hidden md:table-cell"
        style={{ color: "var(--muted-foreground)" }}>
        ¥{(d.amount / 10000).toFixed(2)}万
      </td>

      {/* 情绪 (lg+) */}
      <td className="px-4 py-3 whitespace-nowrap hidden lg:table-cell">
        {isIncomplete
          ? <span style={{ color: "var(--border-subtle)", fontSize: 11 }}>—</span>
          : <div className="flex gap-1.5"><ScoreChip value={d.fomoScore} invert label="F" /><ScoreChip value={d.calmScore} label="C" /></div>
        }
      </td>

      {/* 信号 */}
      <td className="px-4 py-3">
        {hasDanger && !isVoided && !isArchived && !isIncomplete
          ? <span className="inline-flex items-center gap-1 text-[11px] font-medium" style={{ color: "var(--brand-warning)" }}>
              <AlertTriangle size={11} /> {d.dangerSignals.length}
            </span>
          : <span style={{ color: "var(--border-subtle)", fontSize: 11 }}>—</span>
        }
      </td>

      {/* 收益 (md+) */}
      <td className="px-4 py-3 tabular-nums text-sm whitespace-nowrap hidden md:table-cell">
        {hasResult && !isVoided
          ? <span className="font-bold"
              style={{ color: (d.return30Days ?? 0) >= 0 ? "var(--color-up)" : "var(--color-down)" }}>
              {(d.return30Days ?? 0) >= 0 ? "+" : ""}{((d.return30Days ?? 0) * 100).toFixed(1)}%
            </span>
          : <span style={{ color: "var(--border-subtle)", fontSize: 11 }}>—</span>
        }
      </td>

      {/* 日期 */}
      <td className="px-4 py-3 text-[11px] whitespace-nowrap" style={{ color: "var(--muted-foreground)" }}>
        {dayjs(d.createdAt).format("MM/DD HH:mm")}
      </td>

      {/* 操作 */}
      <OperationsCell
        d={d}
        moreOpen={moreOpen}
        onMoreToggle={onMoreToggle}
        onSelect={onSelect}
        onActionDone={onActionDone}
      />
    </tr>
  );
}

// ── Mobile card ─────────────────────────────────────────────────────────────

function DecisionCard({ d, onSelect, onActionDone }: { d: Decision } & ActionCallbacks) {
  const [moreOpen, setMoreOpen] = useState(false);
  const color = ACTION_COLORS[d.action];
  const hasDanger = d.dangerSignals.length > 0;
  const hasResult = d.return30Days !== null;
  const isVoided   = d.status === "VOIDED";
  const isArchived = d.status === "ARCHIVED";
  const isActive   = d.status === "ACTIVE";
  const isIncomplete = d.incomplete && isActive;
  const isBuy = d.action === "BUY" || d.action === "ADD";

  function stop(e: React.MouseEvent) { e.stopPropagation(); }
  const btnBase = "inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-opacity hover:opacity-80 whitespace-nowrap";

  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{
        opacity: isVoided ? 0.5 : isArchived ? 0.6 : 1,
        borderColor: "var(--border-subtle)",
        backgroundColor: isIncomplete ? "rgba(245,158,11,0.03)" : "var(--surface-card)",
      }}
    >
      {/* Main tap area */}
      <button onClick={() => onSelect(d.id)} className="card-interactive flex items-stretch w-full text-left">
        <div className="w-1 shrink-0"
          style={{ backgroundColor: isVoided ? "var(--muted-foreground)" : isArchived ? "var(--border-subtle)" : color }} />
        <div className="flex-1 p-4 flex items-start gap-3 min-w-0">
          <div className="mt-0.5 shrink-0">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded"
              style={{
                backgroundColor: isVoided || isArchived ? "rgba(148,163,184,0.12)" : `${color}18`,
                color: isVoided || isArchived ? "var(--muted-foreground)" : color,
              }}>
              {ACTION_LABELS[d.action]}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm"
                style={{ color: "var(--foreground)", textDecoration: isVoided ? "line-through" : "none" }}>
                {d.stockName}
              </span>
              <span className="text-xs font-mono opacity-60" style={{ color: "var(--muted-foreground)" }}>{d.stockCode}</span>
              {isIncomplete && (
                <span className="flex items-center gap-0.5 text-[11px] font-medium px-1.5 py-0.5 rounded"
                  style={{ color: "var(--brand-warning)", backgroundColor: "rgba(245,158,11,0.12)" }}>
                  <PenLine size={10} /> 待补全
                </span>
              )}
              {hasDanger && !isVoided && !isArchived && !isIncomplete && (
                <span className="flex items-center gap-0.5 text-[11px] font-medium px-1.5 py-0.5 rounded"
                  style={{ color: "var(--brand-warning)", backgroundColor: "rgba(245,158,11,0.12)" }}>
                  <AlertTriangle size={10} /> {d.dangerSignals.length}个危险信号
                </span>
              )}
            </div>
            <p className="text-xs mt-0.5 truncate" style={{ color: "var(--muted-foreground)" }}>
              {isIncomplete ? "点击补全情绪评分和决策依据" : d.reason}
            </p>
            <div className="flex items-center gap-3 mt-1.5 tabular-nums"
              style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>
              <span>¥{d.price.toLocaleString()} × {d.quantity.toLocaleString()} 股</span>
              {!isIncomplete && <><span className="opacity-40">·</span><span>F{d.fomoScore} C{d.calmScore}</span></>}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <span style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>
              {dayjs(d.createdAt).format("MM/DD HH:mm")}
            </span>
            {hasResult && !isVoided && (
              <span className="text-xs font-bold tabular-nums"
                style={{ color: (d.return30Days ?? 0) >= 0 ? "var(--color-up)" : "var(--color-down)" }}>
                {(d.return30Days ?? 0) >= 0 ? "+" : ""}{((d.return30Days ?? 0) * 100).toFixed(1)}%
              </span>
            )}
          </div>
        </div>
      </button>

      {/* Action bar (active only) */}
      {isActive && (
        <div className="flex items-center gap-1.5 px-4 py-2 flex-wrap"
          style={{ borderTop: "1px solid var(--border-subtle)", backgroundColor: "var(--surface-overlay)" }}
          onClick={stop}>
          {isIncomplete && (
            <button type="button" onClick={() => onSelect(d.id)} className={btnBase}
              style={{ backgroundColor: "rgba(245,158,11,0.12)", color: "var(--brand-warning)", border: "1px solid rgba(245,158,11,0.3)" }}>
              <PenLine size={11} /> 补全
            </button>
          )}
          {isBuy && !isIncomplete && (
            <Link href={`/decisions/new?parentId=${d.id}&stockCode=${d.stockCode}&stockName=${encodeURIComponent(d.stockName)}&stockMarket=${d.stockMarket}&action=ADD`}
              className={btnBase}
              style={{ backgroundColor: `${color}12`, color, border: `1px solid ${color}30` }}>
              <TrendingUp size={11} /> 加仓
            </Link>
          )}

          {/* 更多 */}
          <div className="relative ml-auto">
            <button type="button" onClick={() => setMoreOpen((v) => !v)}
              className={btnBase}
              style={{ backgroundColor: moreOpen ? "var(--surface-card)" : "transparent", color: "var(--muted-foreground)", border: "1px solid var(--border-subtle)" }}>
              <MoreHorizontal size={11} /> 更多
            </button>
            {moreOpen && (
              <MoreMenu
                d={d}
                onClose={() => setMoreOpen(false)}
                onSelect={onSelect}
                onActionDone={onActionDone}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
