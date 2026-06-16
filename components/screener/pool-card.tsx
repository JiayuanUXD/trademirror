"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import dayjs from "dayjs";
import type { SnapshotWithCandidates } from "@/lib/db/queries/screener";
import { GateBanner } from "./gate-banner";
import { CandidateRow } from "./candidate-row";

type FilteredSummary = {
  universe: number;
  afterPriceRange: number;
  afterStFilter: number;
  afterNewFilter: number;
  afterTurnoverYi: number;
  afterTurnoverRate: number;
  afterTechnicalProbe?: number;
  afterTrendFilter?: number;
  afterGate: number;
};

export function PoolCard({ initial }: { initial: SnapshotWithCandidates | null }) {
  const router = useRouter();
  const [data, setData] = useState<SnapshotWithCandidates | null>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function rescan() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/screener/scan?force=1", { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "扫描失败");
      } else if (json.skipped) {
        setError(`已跳过：${json.reason}`);
      } else {
        setData({ snapshot: json.snapshot, candidates: json.candidates });
        startTransition(() => router.refresh());
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "网络错误");
    } finally {
      setBusy(false);
    }
  }

  if (!data) {
    return (
      <div
        className="card-surface rounded-xl border p-6 text-center space-y-4"
        style={{ borderColor: "var(--border-subtle)" }}
      >
        <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
          还没有跑过扫描。点下方按钮或等盘后 15:35 自动扫。
        </p>
        <button
          onClick={rescan}
          disabled={busy}
          className="inline-flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg border disabled:opacity-50"
          style={{
            backgroundColor: "var(--brand-blue-dim)",
            borderColor: "var(--brand-blue)",
            color: "var(--brand-blue)",
          }}
        >
          <RefreshCw size={14} className={busy ? "animate-spin" : ""} />
          {busy ? "扫描中…" : "立即扫描"}
        </button>
        {error && <p className="text-xs" style={{ color: "var(--color-down)" }}>{error}</p>}
      </div>
    );
  }

  const { snapshot, candidates } = data;
  let summary: FilteredSummary | null = null;
  try {
    summary = JSON.parse(snapshot.filteredSummary);
  } catch {
    summary = null;
  }

  return (
    <div className="space-y-4">
      <GateBanner
        stage={snapshot.stageAtRun}
        status={snapshot.gateStatus}
        maxSize={snapshot.gateMaxSize}
        poolSize={snapshot.poolSize}
        universeSize={snapshot.universeSize}
        tradeDate={snapshot.tradeDate}
      />

      <div
        className="card-surface rounded-xl border p-5"
        style={{ borderColor: "var(--border-subtle)" }}
      >
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
              候选池（{candidates.length} 只）
            </h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>
              扫描时间 {dayjs(snapshot.runAt).format("YYYY-MM-DD HH:mm")}
            </p>
          </div>
          <button
            onClick={rescan}
            disabled={busy}
            className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border disabled:opacity-50"
            style={{
              backgroundColor: "var(--surface-overlay)",
              borderColor: "var(--border-subtle)",
              color: "var(--foreground)",
            }}
          >
            <RefreshCw size={12} className={busy ? "animate-spin" : ""} />
            {busy ? "扫描中" : "重跑"}
          </button>
        </div>

        {error && (
          <p className="text-xs mb-2" style={{ color: "var(--color-down)" }}>{error}</p>
        )}

        {candidates.length === 0 ? (
          <p className="text-sm py-6 text-center" style={{ color: "var(--muted-foreground)" }}>
            当前阶段闸门暂停，今日没有候选。这就是想要的结果。
          </p>
        ) : (
          <div>
            {candidates.map((c) => (
              <CandidateRow key={c.id} row={c} />
            ))}
          </div>
        )}
      </div>

      {summary && (
        <div
          className="card-surface rounded-xl border p-5"
          style={{ borderColor: "var(--border-subtle)" }}
        >
          <h3
            className="text-xs font-medium uppercase tracking-wider mb-3"
            style={{ color: "var(--muted-foreground)" }}
          >
            过滤漏斗
          </h3>
          <div className="space-y-1.5 text-sm">
            <FunnelStep label="全市场" value={summary.universe} />
            <FunnelStep label="价格区间" value={summary.afterPriceRange} prev={summary.universe} />
            <FunnelStep label="剔除 ST" value={summary.afterStFilter} prev={summary.afterPriceRange} />
            <FunnelStep label="剔除新股" value={summary.afterNewFilter} prev={summary.afterStFilter} />
            <FunnelStep label="成交额达标" value={summary.afterTurnoverYi} prev={summary.afterNewFilter} />
            <FunnelStep label="换手率达标" value={summary.afterTurnoverRate} prev={summary.afterTurnoverYi} />
            <FunnelStep label="进入日K体检" value={summary.afterTechnicalProbe} prev={summary.afterTurnoverRate} />
            <FunnelStep
              label="趋势未走坏"
              value={summary.afterTrendFilter}
              prev={summary.afterTechnicalProbe ?? summary.afterTurnoverRate}
            />
            <FunnelStep
              label="闸门取顶"
              value={summary.afterGate}
              prev={summary.afterTrendFilter ?? summary.afterTechnicalProbe ?? summary.afterTurnoverRate}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function FunnelStep({ label, value, prev }: { label: string; value: number | undefined; prev?: number }) {
  if (value == null) return null;
  const diff = prev != null ? prev - value : null;
  return (
    <div className="flex items-center justify-between">
      <span style={{ color: "var(--muted-foreground)" }}>{label}</span>
      <span className="tabular-nums" style={{ color: "var(--foreground)" }}>
        {value.toLocaleString()}
        {diff != null && diff > 0 && (
          <span className="ml-2 text-xs" style={{ color: "var(--muted-foreground)" }}>
            (-{diff.toLocaleString()})
          </span>
        )}
      </span>
    </div>
  );
}
