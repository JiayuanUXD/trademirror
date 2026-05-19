"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, AlertTriangle, TrendingUp, TrendingDown, Ban, Archive, Camera, PenLine } from "lucide-react";
import { ACTION_LABELS, type DecisionAction, type DecisionStatus } from "@/types/decision";
import type { Decision } from "@/types/decision";
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

const ACTION_ICONS: Record<DecisionAction, React.ReactNode> = {
  BUY:    <TrendingUp size={11} />,
  ADD:    <TrendingUp size={11} />,
  SELL:   <TrendingDown size={11} />,
  REDUCE: <TrendingDown size={11} />,
  CLEAR:  <TrendingDown size={11} />,
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

  const filtered = statusFilter === "ALL"
    ? decisions
    : decisions.filter((d) => d.status === statusFilter);

  const incompleteCount = decisions.filter((d) => d.incomplete && d.status === "ACTIVE").length;

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
            <span className="font-semibold" style={{ color: "var(--brand-warning)" }}>
              {incompleteCount} 张
            </span>{" "}
            批量导入的决策卡尚未补全，点击卡片展开补全表单
          </p>
        </div>
      )}

      {/* Filter bar */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex gap-1.5 flex-wrap">
          {STATUS_FILTERS.map((f) => {
            const isActive = statusFilter === f.value;
            return (
              <button
                key={f.value}
                type="button"
                onClick={() => setStatusFilter(f.value)}
                className="text-xs px-3 py-1.5 rounded-full transition-colors"
                style={{
                  backgroundColor: isActive ? "var(--brand-blue)" : "var(--surface-overlay)",
                  color: isActive ? "#fff" : "var(--muted-foreground)",
                  border: `1px solid ${isActive ? "var(--brand-blue)" : "var(--border-subtle)"}`,
                }}
              >
                {f.label}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => setShowImportModal(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity hover:opacity-80"
          style={{
            backgroundColor: "var(--surface-overlay)",
            color: "var(--muted-foreground)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <Camera size={13} />
          截图导入
        </button>
      </div>

      {/* Empty state */}
      {filtered.length === 0 && decisions.length === 0 && (
        <div
          className="rounded-xl border flex flex-col items-center justify-center py-24 text-center"
          style={{ backgroundColor: "var(--surface-card)", borderColor: "var(--border-subtle)" }}
        >
          <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4"
            style={{ backgroundColor: "var(--brand-blue-dim)" }}>
            <Plus size={20} style={{ color: "var(--brand-blue)" }} />
          </div>
          <p className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>还没有决策卡</p>
          <p className="text-xs mt-1.5 mb-5" style={{ color: "var(--muted-foreground)" }}>
            在下单前先记录你的思考过程，这是最重要的习惯
          </p>
          <div className="flex gap-2">
            <Link
              href="/decisions/new"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white"
              style={{ backgroundColor: "var(--brand-blue)" }}
            >
              <Plus size={14} /> 创建决策卡
            </Link>
            <button
              type="button"
              onClick={() => setShowImportModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-80"
              style={{ backgroundColor: "var(--surface-overlay)", color: "var(--foreground)", border: "1px solid var(--border-subtle)" }}
            >
              <Camera size={14} /> 截图导入
            </button>
          </div>
        </div>
      )}

      {filtered.length === 0 && decisions.length > 0 && (
        <div
          className="rounded-xl border flex flex-col items-center justify-center py-20 text-center"
          style={{ backgroundColor: "var(--surface-card)", borderColor: "var(--border-subtle)" }}
        >
          <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
            没有{STATUS_FILTERS.find((f) => f.value === statusFilter)?.label ?? ""}的决策卡
          </p>
        </div>
      )}

      {filtered.length > 0 && (
        <>
          {/* ── Mobile: card list (hidden on sm+) ── */}
          <div className="space-y-2 sm:hidden">
            {filtered.map((d) => <DecisionCard key={d.id} d={d} onSelect={setSelectedId} />)}
          </div>

          {/* ── Desktop: table (hidden on mobile) ── */}
          <div
            className="hidden sm:block rounded-xl border overflow-hidden"
            style={{ borderColor: "var(--border-subtle)" }}
          >
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr style={{ backgroundColor: "var(--surface-overlay)", borderBottom: "1px solid var(--border-subtle)" }}>
                  <Th>操作</Th>
                  <Th>股票</Th>
                  <Th>价格 × 数量</Th>
                  <Th className="hidden md:table-cell">金额</Th>
                  <Th className="hidden lg:table-cell">情绪</Th>
                  <Th>信号</Th>
                  <Th className="hidden md:table-cell">收益</Th>
                  <Th>日期</Th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((d, i) => (
                  <DecisionRow
                    key={d.id}
                    d={d}
                    isLast={i === filtered.length - 1}
                    onSelect={setSelectedId}
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
        <ImportVisionModal
          onClose={() => { setShowImportModal(false); router.refresh(); }}
        />
      )}
    </>
  );
}

// ── Shared helpers ──────────────────────────────────────────────────────────

function ActionBadge({ d }: { d: Decision }) {
  const isVoided = d.status === "VOIDED";
  const isArchived = d.status === "ARCHIVED";
  const isIncomplete = d.incomplete && d.status === "ACTIVE";
  const color = ACTION_COLORS[d.action];

  if (isIncomplete) {
    return (
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold whitespace-nowrap"
        style={{ backgroundColor: "rgba(245,158,11,0.12)", color: "var(--brand-warning)" }}
      >
        <PenLine size={10} /> 待补全
      </span>
    );
  }
  if (isVoided) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold whitespace-nowrap"
        style={{ backgroundColor: "rgba(148,163,184,0.12)", color: "var(--muted-foreground)" }}>
        <Ban size={10} /> 已作废
      </span>
    );
  }
  if (isArchived) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold whitespace-nowrap"
        style={{ backgroundColor: "rgba(148,163,184,0.12)", color: "var(--muted-foreground)" }}>
        <Archive size={10} /> 已归档
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold whitespace-nowrap"
      style={{ backgroundColor: `${color}18`, color }}
    >
      {ACTION_ICONS[d.action]} {ACTION_LABELS[d.action]}
    </span>
  );
}

// ── Mobile card ─────────────────────────────────────────────────────────────

function DecisionCard({ d, onSelect }: { d: Decision; onSelect: (id: string) => void }) {
  const color = ACTION_COLORS[d.action];
  const hasDanger = d.dangerSignals.length > 0;
  const hasResult = d.return30Days !== null;
  const isVoided = d.status === "VOIDED";
  const isArchived = d.status === "ARCHIVED";
  const isIncomplete = d.incomplete && d.status === "ACTIVE";

  return (
    <button
      onClick={() => onSelect(d.id)}
      className="card-interactive rounded-xl border flex items-stretch overflow-hidden w-full text-left"
      style={{ opacity: isVoided ? 0.5 : isArchived ? 0.6 : 1 }}
    >
      <div className="w-1 shrink-0"
        style={{ backgroundColor: isVoided ? "var(--muted-foreground)" : isArchived ? "var(--border-subtle)" : color }} />
      <div className="flex-1 p-4 flex items-start gap-4 min-w-0">
        <div className="mt-0.5 shrink-0"><ActionBadge d={d} /></div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm"
              style={{ color: "var(--foreground)", textDecoration: isVoided ? "line-through" : "none" }}>
              {d.stockName}
            </span>
            <span className="text-xs font-mono opacity-60" style={{ color: "var(--muted-foreground)" }}>
              {d.stockCode}
            </span>
            {hasDanger && !isVoided && !isArchived && !isIncomplete && (
              <span className="flex items-center gap-0.5 text-[11px] font-medium px-1.5 py-0.5 rounded"
                style={{ color: "var(--brand-warning)", backgroundColor: "rgba(245,158,11,0.12)" }}>
                <AlertTriangle size={10} /> {d.dangerSignals.length} 个危险信号
              </span>
            )}
          </div>
          <p className="text-xs mt-0.5 truncate" style={{ color: "var(--muted-foreground)" }}>{d.reason}</p>
          <div className="flex items-center gap-3 mt-1.5 tabular-nums"
            style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>
            <span>¥{d.price.toLocaleString()} × {d.quantity.toLocaleString()} 股</span>
            {!isIncomplete && (
              <>
                <span className="opacity-40">·</span>
                <span>FOMO {d.fomoScore} / 平静 {d.calmScore}</span>
              </>
            )}
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
  );
}

// ── Desktop table helpers ───────────────────────────────────────────────────

function Th({ children, className = "" }: { children?: React.ReactNode; className?: string }) {
  return (
    <th
      className={`px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider whitespace-nowrap ${className}`}
      style={{ color: "var(--muted-foreground)" }}
    >
      {children}
    </th>
  );
}

function DecisionRow({ d, isLast, onSelect }: { d: Decision; isLast: boolean; onSelect: (id: string) => void }) {
  const isVoided = d.status === "VOIDED";
  const isArchived = d.status === "ARCHIVED";
  const isIncomplete = d.incomplete && d.status === "ACTIVE";
  const hasDanger = d.dangerSignals.length > 0;
  const hasResult = d.return30Days !== null;
  const color = ACTION_COLORS[d.action];

  return (
    <tr
      onClick={() => onSelect(d.id)}
      className="cursor-pointer transition-colors"
      style={{
        opacity: isVoided ? 0.45 : isArchived ? 0.6 : 1,
        borderBottom: isLast ? "none" : "1px solid var(--border-subtle)",
        backgroundColor: isIncomplete ? "rgba(245,158,11,0.03)" : "var(--surface-card)",
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.backgroundColor = isIncomplete ? "rgba(245,158,11,0.07)" : "var(--surface-overlay)"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.backgroundColor = isIncomplete ? "rgba(245,158,11,0.03)" : "var(--surface-card)"; }}
    >
      {/* 操作 */}
      <td className="px-4 py-3 whitespace-nowrap">
        <ActionBadge d={d} />
      </td>

      {/* 股票 */}
      <td className="px-4 py-3">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-medium"
            style={{ color: "var(--foreground)", textDecoration: isVoided ? "line-through" : "none" }}>
            {d.stockName}
          </span>
          <span className="text-[11px] font-mono" style={{ color: "var(--muted-foreground)" }}>
            {d.stockCode}
          </span>
        </div>
        {/* Reason shown as subtitle only on md+ */}
        <p className="text-[11px] mt-0.5 max-w-[220px] truncate hidden md:block"
          style={{ color: "var(--muted-foreground)" }}>
          {isIncomplete ? "—" : d.reason}
        </p>
      </td>

      {/* 价格 × 数量 */}
      <td className="px-4 py-3 tabular-nums text-sm whitespace-nowrap" style={{ color: "var(--foreground)" }}>
        <span style={{ color: isVoided || isArchived ? "var(--muted-foreground)" : color }}>
          ¥{d.price.toLocaleString()}
        </span>
        <span className="mx-1" style={{ color: "var(--muted-foreground)" }}>×</span>
        <span style={{ color: "var(--muted-foreground)" }}>{d.quantity.toLocaleString()}</span>
      </td>

      {/* 金额 (md+) */}
      <td className="px-4 py-3 tabular-nums text-sm whitespace-nowrap hidden md:table-cell"
        style={{ color: "var(--muted-foreground)" }}>
        ¥{(d.amount / 10000).toFixed(2)} 万
      </td>

      {/* 情绪 (lg+) */}
      <td className="px-4 py-3 whitespace-nowrap hidden lg:table-cell">
        {isIncomplete ? (
          <span style={{ color: "var(--border-subtle)" }}>—</span>
        ) : (
          <div className="flex gap-2 text-[11px]">
            <ScoreChip value={d.fomoScore} invert label="F" />
            <ScoreChip value={d.calmScore} label="C" />
          </div>
        )}
      </td>

      {/* 危险信号 */}
      <td className="px-4 py-3">
        {hasDanger && !isVoided && !isArchived && !isIncomplete ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium"
            style={{ color: "var(--brand-warning)" }}>
            <AlertTriangle size={11} /> {d.dangerSignals.length}
          </span>
        ) : (
          <span style={{ color: "var(--border-subtle)" }}>—</span>
        )}
      </td>

      {/* 收益 (md+) */}
      <td className="px-4 py-3 tabular-nums text-sm whitespace-nowrap hidden md:table-cell">
        {hasResult && !isVoided ? (
          <span className="font-bold"
            style={{ color: (d.return30Days ?? 0) >= 0 ? "var(--color-up)" : "var(--color-down)" }}>
            {(d.return30Days ?? 0) >= 0 ? "+" : ""}
            {((d.return30Days ?? 0) * 100).toFixed(1)}%
          </span>
        ) : (
          <span style={{ color: "var(--border-subtle)" }}>—</span>
        )}
      </td>

      {/* 日期 */}
      <td className="px-4 py-3 text-[11px] whitespace-nowrap" style={{ color: "var(--muted-foreground)" }}>
        {dayjs(d.createdAt).format("MM/DD HH:mm")}
      </td>
    </tr>
  );
}

function ScoreChip({ value, invert = false, label }: { value: number; invert?: boolean; label: string }) {
  const bad = invert ? value >= 7 : value <= 4;
  const good = invert ? value < 5 : value >= 7;
  const color = bad ? "var(--brand-red)" : good ? "var(--brand-green)" : "var(--brand-warning)";
  return (
    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded font-mono"
      style={{ backgroundColor: `${color}18`, color }}>
      {label}{value}
    </span>
  );
}
