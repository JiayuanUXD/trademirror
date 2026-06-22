"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import dayjs from "dayjs";
import type { SnapshotWithCandidates } from "@/lib/db/queries/screener";
import { GateBanner } from "./gate-banner";
import { CandidateRow } from "./candidate-row";

import type { FunnelSummary } from "./strategy-info";

export function PoolCard({
  initial,
  onFunnelChange,
}: {
  initial: SnapshotWithCandidates | null;
  onFunnelChange?: (f: FunnelSummary | null) => void;
}) {
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
  let funnel: FunnelSummary | null = null;
  try {
    funnel = JSON.parse(snapshot.filteredSummary);
  } catch {
    funnel = null;
  }

  useEffect(() => {
    onFunnelChange?.(funnel);
  }, [snapshot.filteredSummary]);

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

    </div>
  );
}
