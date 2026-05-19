"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, AlertTriangle, TrendingUp, TrendingDown, FilePlus } from "lucide-react";
import type { Holding, HoldingStatus } from "@/types/holding";
import { STATUS_LABELS, STATUS_COLORS } from "@/types/holding";
import { inferSector } from "@/lib/sector-inference";
import { HoldingSheet, type HoldingSheetMode } from "./holding-sheet";

// ─── Filter config ────────────────────────────────────────────────────────────

const STATUS_FILTERS: { value: HoldingStatus | "ALL"; label: string }[] = [
  { value: "ALL",      label: "全部" },
  { value: "HOLDING",  label: "持有" },
  { value: "WATCHING", label: "观察" },
  { value: "CLOSED",   label: "已清仓" },
];

const STATUS_ACCENT: Record<string, string> = {
  HOLDING: "var(--brand-green)",
  WATCHING: "var(--brand-warning)",
  CLOSED:  "var(--border-default)",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function resolvedSector(h: Holding): string {
  return h.sector || inferSector(h.stockCode, h.stockName);
}

function healthColor(score: number): string {
  if (score >= 60) return "var(--brand-green)";
  if (score >= 30) return "var(--brand-warning)";
  return "var(--brand-red)";
}

// ─── Mobile card ──────────────────────────────────────────────────────────────

function HoldingRow({ h, onOpen }: { h: Holding; onOpen: (h: Holding) => void }) {
  const accent     = STATUS_ACCENT[h.status] ?? "var(--border-subtle)";
  const sector     = resolvedSector(h);
  const pnlPct     = h.currentPrice && h.costPrice ? ((h.currentPrice - h.costPrice) / h.costPrice) * 100 : null;
  const amountWan  = (h.costPrice * h.shares) / 10_000;
  const noExit     = h.exitConditions.length === 0 && h.status === "HOLDING";

  return (
    <button
      type="button"
      onClick={() => onOpen(h)}
      className="w-full text-left block rounded-xl border p-4 transition-colors card-interactive"
      style={{
        borderColor: "var(--border-subtle)",
        backgroundColor: "var(--surface-card)",
        borderLeftWidth: 3,
        borderLeftColor: accent,
      }}
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm" style={{ color: "var(--foreground)" }}>{h.stockName}</span>
            <span className="text-xs font-mono" style={{ color: "var(--muted-foreground)" }}>{h.stockCode}</span>
            {sector && (
              <span
                className="text-[10px] px-1.5 py-0.5 rounded-md"
                style={{ backgroundColor: "var(--surface-overlay)", color: "var(--muted-foreground)" }}
              >
                {sector}
              </span>
            )}
            {noExit && (
              <span
                className="flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-md font-medium"
                style={{ backgroundColor: "rgba(245,158,11,0.1)", color: "var(--brand-warning)" }}
              >
                <AlertTriangle size={9} /> 无止损
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs" style={{ color: "var(--muted-foreground)" }}>
            {h.shares > 0 ? (
              <>
                <span>成本 ¥{h.costPrice.toLocaleString()}</span>
                <span className="opacity-40">·</span>
                <span>{h.shares.toLocaleString()} 股</span>
                {amountWan >= 0.01 && (
                  <>
                    <span className="opacity-40">·</span>
                    <span>¥{amountWan.toFixed(1)} 万</span>
                  </>
                )}
              </>
            ) : <span>已清仓</span>}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <span
            className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
            style={{ color: STATUS_COLORS[h.status], backgroundColor: `${STATUS_COLORS[h.status]}1A` }}
          >
            {STATUS_LABELS[h.status]}
          </span>
          {pnlPct !== null && (
            <span
              className="text-xs font-bold tabular-nums"
              style={{ color: pnlPct >= 0 ? "var(--color-up)" : "var(--color-down)" }}
            >
              {pnlPct >= 0 ? "+" : ""}{pnlPct.toFixed(2)}%
            </span>
          )}
        </div>
      </div>

      {/* Health bar */}
      <div className="mt-3 space-y-1">
        <div className="flex items-center justify-between" style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>
          <span>档案健康度</span>
          <span className="font-semibold" style={{ color: healthColor(h.healthScore) }}>{h.healthScore}</span>
        </div>
        <div className="h-1 rounded-full overflow-hidden" style={{ backgroundColor: "var(--surface-overlay)" }}>
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${h.healthScore}%`, backgroundColor: healthColor(h.healthScore) }}
          />
        </div>
      </div>
    </button>
  );
}

// ─── Desktop table row ────────────────────────────────────────────────────────

function TableRow({ h, onOpen }: { h: Holding; onOpen: (h: Holding) => void }) {
  const sector     = resolvedSector(h);
  const pnlPct     = h.currentPrice && h.costPrice ? ((h.currentPrice - h.costPrice) / h.costPrice) * 100 : null;
  const amountWan  = (h.costPrice * h.shares) / 10_000;
  const noExit     = h.exitConditions.length === 0 && h.status === "HOLDING";
  const accent     = STATUS_ACCENT[h.status] ?? "var(--border-subtle)";

  return (
    <tr
      className="group border-b transition-colors hover:bg-[var(--surface-overlay)] cursor-pointer"
      style={{ borderColor: "var(--border-subtle)" }}
      onClick={() => onOpen(h)}
    >
      {/* 股票 */}
      <td className="py-3 pl-4 pr-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-block w-1 h-4 rounded-full shrink-0" style={{ backgroundColor: accent }} />
          <span className="font-medium text-sm" style={{ color: "var(--foreground)" }}>{h.stockName}</span>
          <span className="text-xs font-mono" style={{ color: "var(--muted-foreground)" }}>{h.stockCode}</span>
          {noExit && (
            <span
              className="flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-md font-medium"
              style={{ backgroundColor: "rgba(245,158,11,0.1)", color: "var(--brand-warning)" }}
            >
              <AlertTriangle size={9} /> 无止损
            </span>
          )}
        </div>
      </td>

      {/* 板块 */}
      <td className="py-3 px-2">
        {sector ? (
          <span
            className="text-[10px] px-1.5 py-0.5 rounded-md"
            style={{ backgroundColor: "var(--surface-overlay)", color: "var(--muted-foreground)" }}
          >
            {sector}
          </span>
        ) : (
          <span className="text-xs opacity-30" style={{ color: "var(--muted-foreground)" }}>—</span>
        )}
      </td>

      {/* 成本×股数 */}
      <td className="py-3 px-2 text-sm tabular-nums">
        {h.shares > 0 ? (
          <div>
            <div style={{ color: "var(--foreground)" }}>¥{h.costPrice.toLocaleString()}</div>
            <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>{h.shares.toLocaleString()} 股</div>
          </div>
        ) : <span className="text-xs opacity-40" style={{ color: "var(--muted-foreground)" }}>已清仓</span>}
      </td>

      {/* 持仓市值 */}
      <td className="py-3 px-2 text-sm tabular-nums">
        {h.shares > 0 && amountWan >= 0.01 ? (
          <div>
            <div style={{ color: "var(--foreground)" }}>¥{amountWan.toFixed(1)} 万</div>
            {pnlPct !== null && (
              <div
                className="text-xs font-semibold"
                style={{ color: pnlPct >= 0 ? "var(--color-up)" : "var(--color-down)" }}
              >
                {pnlPct >= 0 ? "+" : ""}{pnlPct.toFixed(2)}%
              </div>
            )}
          </div>
        ) : <span className="text-xs opacity-40" style={{ color: "var(--muted-foreground)" }}>—</span>}
      </td>

      {/* 健康度 */}
      <td className="py-3 px-2">
        <div className="flex items-center gap-2 min-w-[80px]">
          <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "var(--surface-overlay)" }}>
            <div
              className="h-full rounded-full"
              style={{ width: `${h.healthScore}%`, backgroundColor: healthColor(h.healthScore) }}
            />
          </div>
          <span className="text-xs font-medium tabular-nums w-7 text-right" style={{ color: healthColor(h.healthScore) }}>
            {h.healthScore}
          </span>
        </div>
      </td>

      {/* 状态 */}
      <td className="py-3 pl-2 pr-4">
        <span
          className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
          style={{ color: STATUS_COLORS[h.status], backgroundColor: `${STATUS_COLORS[h.status]}1A` }}
        >
          {STATUS_LABELS[h.status]}
        </span>
      </td>
    </tr>
  );
}

// ─── Inferred claim card ──────────────────────────────────────────────────────

function InferredRow({ h, onClaimed }: { h: Holding; onClaimed: (holding: Holding) => void }) {
  const router  = useRouter();
  const [loading, setLoading] = useState(false);
  const sector    = resolvedSector(h);
  const amountWan = (h.costPrice * h.shares) / 10_000;

  async function handleClaim() {
    setLoading(true);
    try {
      const res = await fetch("/api/holdings/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stockCode: h.stockCode }),
      });
      if (!res.ok) throw new Error("failed");
      const created = await res.json() as Holding;
      router.refresh();
      onClaimed(created);
    } catch {
      setLoading(false);
    }
  }

  return (
    <div
      className="rounded-xl border p-4 flex items-center gap-4"
      style={{
        borderColor: "var(--border-subtle)",
        backgroundColor: "var(--surface-card)",
        borderLeftWidth: 3,
        borderLeftColor: h.status === "HOLDING" ? "var(--color-up)" : "var(--muted-foreground)",
        opacity: 0.85,
      }}
    >
      <div
        className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
        style={{ backgroundColor: h.status === "HOLDING" ? "rgba(239,68,68,0.1)" : "rgba(148,163,184,0.12)" }}
      >
        {h.status === "HOLDING"
          ? <TrendingUp size={15} style={{ color: "var(--color-up)" }} />
          : <TrendingDown size={15} style={{ color: "var(--muted-foreground)" }} />}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-sm" style={{ color: "var(--foreground)" }}>{h.stockName}</span>
          <span className="text-xs font-mono" style={{ color: "var(--muted-foreground)" }}>{h.stockCode}</span>
          {sector && (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded-md"
              style={{ backgroundColor: "var(--surface-overlay)", color: "var(--muted-foreground)" }}
            >
              {sector}
            </span>
          )}
          <span
            className="text-[10px] px-1.5 py-0.5 rounded-md"
            style={{ backgroundColor: "rgba(61,142,248,0.1)", color: "var(--brand-blue)" }}
          >
            从决策卡聚合
          </span>
        </div>
        <div className="flex items-center gap-3 mt-1 text-xs" style={{ color: "var(--muted-foreground)" }}>
          {h.shares > 0 ? (
            <>
              <span>成本 ¥{h.costPrice.toLocaleString()}</span>
              <span className="opacity-40">·</span>
              <span>{h.shares.toLocaleString()} 股</span>
              {amountWan >= 0.01 && (
                <>
                  <span className="opacity-40">·</span>
                  <span>¥{amountWan.toFixed(1)} 万</span>
                </>
              )}
            </>
          ) : <span>已清仓</span>}
        </div>
      </div>

      <button
        type="button"
        onClick={handleClaim}
        disabled={loading}
        className="shrink-0 flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80 disabled:opacity-50"
        style={{ backgroundColor: "var(--brand-blue)", color: "#fff" }}
      >
        <FilePlus size={13} />
        {loading ? "建档中…" : "建立档案"}
      </button>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

type Props = {
  holdings: Holding[];   // real (profiled) holdings
  inferred: Holding[];   // inferred from decisions only
};

export function HoldingsList({ holdings, inferred }: Props) {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<HoldingStatus | "ALL">("ALL");
  const [sheetOpen, setSheetOpen]       = useState(false);
  const [sheetMode, setSheetMode]       = useState<HoldingSheetMode>({ type: "new" });

  const filtered = statusFilter === "ALL"
    ? holdings
    : holdings.filter((h) => h.status === statusFilter);

  const noExit = holdings.filter((h) => h.status === "HOLDING" && h.exitConditions.length === 0).length;

  const openDetail = useCallback((h: Holding) => {
    setSheetMode({ type: "detail", holding: h });
    setSheetOpen(true);
  }, []);

  const openNew = useCallback(() => {
    setSheetMode({ type: "new" });
    setSheetOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    setSheetOpen(false);
    router.refresh();
  }, [router]);

  // After creating a new holding → switch sheet to detail mode
  const handleCreated = useCallback((holding: Holding) => {
    setSheetMode({ type: "detail", holding });
    router.refresh();
  }, [router]);

  // After claiming an inferred holding → open its detail sheet
  const handleClaimed = useCallback((holding: Holding) => {
    setSheetMode({ type: "detail", holding });
    setSheetOpen(true);
  }, []);

  const activeCount = holdings.filter((h) => h.status !== "CLOSED").length;
  const hasAny = holdings.length > 0 || inferred.length > 0;

  return (
    <>
      {/* ── Page header ───────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>持仓库</h1>
          <p className="text-sm mt-0.5 flex items-center gap-2" style={{ color: "var(--muted-foreground)" }}>
            <span>{activeCount > 0 ? `${activeCount} 只持有/观察中` : "暂无持仓"}</span>
            {inferred.length > 0 && (
              <span
                className="text-xs px-1.5 py-0.5 rounded font-medium"
                style={{ backgroundColor: "rgba(61,142,248,0.12)", color: "var(--brand-blue)" }}
              >
                {inferred.length} 只待建档
              </span>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={openNew}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium text-white"
          style={{ backgroundColor: "var(--brand-blue)" }}
        >
          <Plus size={14} />
          新建档案
        </button>
      </div>

      {/* ── Empty state ───────────────────────────────────────────────────── */}
      {!hasAny && (
        <div
          className="rounded-lg border flex flex-col items-center justify-center py-20 text-center"
          style={{ backgroundColor: "var(--surface-card)", borderColor: "var(--border-subtle)" }}
        >
          <p className="text-sm font-medium" style={{ color: "var(--foreground)" }}>还没有持仓档案</p>
          <p className="text-xs mt-1 mb-4" style={{ color: "var(--muted-foreground)" }}>
            为每只股票建立一份成长档案，记录持有逻辑和撤退条件
          </p>
          <button
            type="button"
            onClick={openNew}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium text-white"
            style={{ backgroundColor: "var(--brand-blue)" }}
          >
            <Plus size={14} />
            新建第一份档案
          </button>
        </div>
      )}

      {/* ── Warning banner ────────────────────────────────────────────────── */}
      {noExit > 0 && (
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-xl"
          style={{ backgroundColor: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)" }}
        >
          <AlertTriangle size={15} className="shrink-0" style={{ color: "var(--brand-warning)" }} />
          <p className="flex-1 text-xs" style={{ color: "var(--muted-foreground)" }}>
            <span className="font-semibold" style={{ color: "var(--brand-warning)" }}>{noExit} 只</span>{" "}
            持仓尚未设置撤退条件，建议补全止损规则以保护本金
          </p>
        </div>
      )}

      {/* ── Filter bar ────────────────────────────────────────────────────── */}
      {hasAny && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {STATUS_FILTERS.map((f) => {
            const count = f.value === "ALL"
              ? holdings.length
              : holdings.filter((h) => h.status === f.value).length;
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
                }}
              >
                {f.label}
                {count > 0 && (
                  <span className="ml-1.5 text-[10px] font-mono" style={{ opacity: isActive ? 0.8 : 0.6 }}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Empty filter result ───────────────────────────────────────────── */}
      {hasAny && filtered.length === 0 && (
        <div
          className="rounded-lg border py-12 text-center"
          style={{ borderColor: "var(--border-subtle)", backgroundColor: "var(--surface-card)" }}
        >
          <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>该分类下暂无持仓</p>
        </div>
      )}

      {/* ── Mobile cards ──────────────────────────────────────────────────── */}
      {filtered.length > 0 && (
        <div className="sm:hidden space-y-2">
          {filtered.map((h) => <HoldingRow key={h.id} h={h} onOpen={openDetail} />)}
        </div>
      )}

      {/* ── Desktop table ─────────────────────────────────────────────────── */}
      {filtered.length > 0 && (
        <div
          className="hidden sm:block rounded-xl border overflow-hidden"
          style={{ borderColor: "var(--border-subtle)", backgroundColor: "var(--surface-card)" }}
        >
          <table className="w-full text-left">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-subtle)", backgroundColor: "var(--surface-overlay)" }}>
                <th className="py-2.5 pl-4 pr-2 text-xs font-medium" style={{ color: "var(--muted-foreground)" }}>股票</th>
                <th className="py-2.5 px-2 text-xs font-medium" style={{ color: "var(--muted-foreground)" }}>板块</th>
                <th className="py-2.5 px-2 text-xs font-medium" style={{ color: "var(--muted-foreground)" }}>成本 × 股数</th>
                <th className="py-2.5 px-2 text-xs font-medium" style={{ color: "var(--muted-foreground)" }}>持仓市值</th>
                <th className="py-2.5 px-2 text-xs font-medium" style={{ color: "var(--muted-foreground)" }}>健康度</th>
                <th className="py-2.5 pl-2 pr-4 text-xs font-medium" style={{ color: "var(--muted-foreground)" }}>状态</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((h) => <TableRow key={h.id} h={h} onOpen={openDetail} />)}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Inferred holdings ─────────────────────────────────────────────── */}
      {inferred.length > 0 && (
        <div className="space-y-2">
          <p
            className="text-xs font-medium uppercase tracking-wider"
            style={{ color: "var(--muted-foreground)" }}
          >
            从决策卡聚合（尚未建档）
          </p>
          {inferred.map((h) => (
            <InferredRow key={h.stockCode} h={h} onClaimed={handleClaimed} />
          ))}
        </div>
      )}

      {/* ── Sheet ─────────────────────────────────────────────────────────── */}
      <HoldingSheet
        open={sheetOpen}
        mode={sheetMode}
        onClose={handleClose}
        onCreated={handleCreated}
      />
    </>
  );
}
