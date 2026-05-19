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
  { value: "ALL", label: "全部" },
  { value: "ACTIVE", label: "活跃" },
  { value: "VOIDED", label: "已作废" },
  { value: "ARCHIVED", label: "已归档" },
];

type Props = {
  decisions: Decision[];
};

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
          style={{
            backgroundColor: "rgba(245,158,11,0.08)",
            border: "1px solid rgba(245,158,11,0.25)",
          }}
        >
          <PenLine size={15} className="shrink-0" style={{ color: "var(--brand-warning)" }} />
          <p className="flex-1 text-xs" style={{ color: "var(--muted-foreground)" }}>
            <span className="font-semibold" style={{ color: "var(--brand-warning)" }}>
              {incompleteCount} 张
            </span>{" "}
            批量导入的决策卡尚未补全情绪评分和决策依据，点击卡片逐一完善
          </p>
        </div>
      )}

      {/* Header row: filter tabs + import button */}
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
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center mb-4"
            style={{ backgroundColor: "var(--brand-blue-dim)" }}
          >
            <Plus size={20} style={{ color: "var(--brand-blue)" }} />
          </div>
          <p className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
            还没有决策卡
          </p>
          <p className="text-xs mt-1.5 mb-5" style={{ color: "var(--muted-foreground)" }}>
            在下单前先记录你的思考过程，这是最重要的习惯
          </p>
          <div className="flex gap-2">
            <Link
              href="/decisions/new"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white"
              style={{ backgroundColor: "var(--brand-blue)" }}
            >
              <Plus size={14} />
              创建决策卡
            </Link>
            <button
              type="button"
              onClick={() => setShowImportModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-80"
              style={{
                backgroundColor: "var(--surface-overlay)",
                color: "var(--foreground)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <Camera size={14} />
              截图导入
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

      {/* Decision list */}
      {filtered.length > 0 && (
        <div className="space-y-2">
          {filtered.map((d) => {
            const color = ACTION_COLORS[d.action];
            const hasDanger = d.dangerSignals.length > 0;
            const hasResult = d.return30Days !== null;
            const isVoided = d.status === "VOIDED";
            const isArchived = d.status === "ARCHIVED";
            const isIncomplete = d.incomplete && d.status === "ACTIVE";

            return (
              <button
                key={d.id}
                onClick={() => setSelectedId(d.id)}
                className="card-interactive rounded-xl border flex items-stretch overflow-hidden w-full text-left"
                style={{ opacity: isVoided ? 0.5 : isArchived ? 0.6 : 1 }}
              >
                {/* Left accent bar */}
                <div
                  className="w-1 shrink-0"
                  style={{ backgroundColor: isVoided ? "var(--muted-foreground)" : isArchived ? "var(--border-subtle)" : color }}
                />

                {/* Content */}
                <div className="flex-1 p-4 flex items-start gap-4 min-w-0">
                  {/* Action badge */}
                  <div
                    className="mt-0.5 flex items-center gap-1 px-2 py-1 rounded-md text-xs font-bold shrink-0"
                    style={{
                      backgroundColor: isVoided || isArchived ? "rgba(148,163,184,0.12)" : `${color}18`,
                      color: isVoided || isArchived ? "var(--muted-foreground)" : color,
                    }}
                  >
                    {isVoided ? <Ban size={11} /> : isArchived ? <Archive size={11} /> : ACTION_ICONS[d.action]}
                    {isVoided ? "已作废" : isArchived ? "已归档" : ACTION_LABELS[d.action]}
                  </div>

                  {/* Main info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="font-semibold text-sm"
                        style={{
                          color: "var(--foreground)",
                          textDecoration: isVoided ? "line-through" : "none",
                        }}
                      >
                        {d.stockName}
                      </span>
                      <span className="text-xs font-mono opacity-60" style={{ color: "var(--muted-foreground)" }}>
                        {d.stockCode}
                      </span>
                      {isIncomplete && (
                        <span
                          className="flex items-center gap-0.5 text-[11px] font-medium px-1.5 py-0.5 rounded"
                          style={{
                            color: "var(--brand-warning)",
                            backgroundColor: "rgba(245,158,11,0.12)",
                          }}
                        >
                          <PenLine size={10} />
                          待补全
                        </span>
                      )}
                      {hasDanger && !isVoided && !isArchived && !isIncomplete && (
                        <span
                          className="flex items-center gap-0.5 text-[11px] font-medium px-1.5 py-0.5 rounded"
                          style={{
                            color: "var(--brand-warning)",
                            backgroundColor: "rgba(245,158,11,0.12)",
                          }}
                        >
                          <AlertTriangle size={10} />
                          {d.dangerSignals.length} 个危险信号
                        </span>
                      )}
                    </div>
                    <p className="text-xs mt-0.5 truncate" style={{ color: "var(--muted-foreground)" }}>
                      {d.reason}
                    </p>
                    <div
                      className="flex items-center gap-3 mt-1.5 tabular-nums"
                      style={{ fontSize: "11px", color: "var(--muted-foreground)" }}
                    >
                      <span>¥{d.price.toLocaleString()} × {d.quantity.toLocaleString()} 股</span>
                      {!isIncomplete && (
                        <>
                          <span className="opacity-40">·</span>
                          <span>FOMO {d.fomoScore} / 平静 {d.calmScore}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Right meta */}
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>
                      {dayjs(d.createdAt).format("MM/DD HH:mm")}
                    </span>
                    {hasResult && !isVoided && (
                      <span
                        className="text-xs font-bold tabular-nums"
                        style={{
                          color: (d.return30Days ?? 0) >= 0 ? "var(--color-up)" : "var(--color-down)",
                        }}
                      >
                        {(d.return30Days ?? 0) >= 0 ? "+" : ""}
                        {((d.return30Days ?? 0) * 100).toFixed(1)}%
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Sheet */}
      <DecisionSheet
        decisionId={selectedId}
        onClose={() => setSelectedId(null)}
        onDecisionChange={() => router.refresh()}
      />

      {/* Import modal */}
      {showImportModal && (
        <ImportVisionModal
          onClose={() => {
            setShowImportModal(false);
            router.refresh();
          }}
        />
      )}
    </>
  );
}
