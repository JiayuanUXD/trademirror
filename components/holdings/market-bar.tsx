"use client";

import { useState, useEffect, useMemo, createContext, useContext } from "react";
import Link from "next/link";
import { Loader2, RefreshCw, FileText } from "lucide-react";
import type { TechnicalResult, SignalSummary } from "@/lib/technical/types";
import { summarize } from "@/lib/technical/signals";

// ─── Digest Context ─────────────────────────────────────────────────────────

type DigestSignal = {
  rating: SignalSummary["rating"];
  pctChg: number;
  bullCount: number;
  bearCount: number;
};

type DigestContextValue = {
  signals: Map<string, DigestSignal>;
  tradeDate: string | null;
  loading: boolean;
};

const DigestCtx = createContext<DigestContextValue>({ signals: new Map(), tradeDate: null, loading: false });

export function useDigestSignals() {
  return useContext(DigestCtx);
}

// ─── Types ──────────────────────────────────────────────────────────────────

type MarketIndex = { close: number; pctChg: number } | null;
type MarketMap = { sh: MarketIndex; sz: MarketIndex; cy: MarketIndex };

type DigestData = {
  tradeDate: string;
  marketData: string;
  stockAnalyses: string;
};

// ─── Provider + MarketBar ───────────────────────────────────────────────────

function formatDateLabel(d: string): string {
  const weekDays = ["日", "一", "二", "三", "四", "五", "六"];
  const date = new Date(Number(d.slice(0, 4)), Number(d.slice(4, 6)) - 1, Number(d.slice(6, 8)));
  return `${d.slice(4, 6)}-${d.slice(6, 8)} 周${weekDays[date.getDay()]}`;
}

export function DigestProvider({ hasHolding, children }: { hasHolding: boolean; children: React.ReactNode }) {
  const [data, setData] = useState<DigestData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const fetchDigest = async (refresh = false) => {
    setLoading(true);
    setError(false);
    try {
      const url = refresh ? "/api/digest?refresh=1" : "/api/digest?mode=cached";
      const res = await fetch(url);
      if (res.status === 404 && !refresh) {
        // 没有缓存，触发生成
        const genRes = await fetch("/api/digest");
        if (genRes.ok) setData(await genRes.json());
        else setError(true);
        return;
      }
      if (!res.ok) { setError(true); return; }
      setData(await res.json());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasHolding) void fetchDigest(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasHolding]);

  // 解析信号数据
  const ctxValue = useMemo<DigestContextValue>(() => {
    if (!data) return { signals: new Map(), tradeDate: null, loading };

    const map = new Map<string, DigestSignal>();
    try {
      const analyses = JSON.parse(data.stockAnalyses) as TechnicalResult[];
      for (const a of analyses) {
        const s = summarize(a);
        const bullCount = s.signals.filter(sig => sig.bias === "bullish").length;
        const bearCount = s.signals.filter(sig => sig.bias === "bearish").length;
        map.set(a.stockCode, { rating: s.rating, pctChg: a.quote.pctChg, bullCount, bearCount });
      }
    } catch { /* ignore */ }

    return { signals: map, tradeDate: data.tradeDate, loading };
  }, [data, loading]);

  // 解析大盘
  let market: MarketMap = { sh: null, sz: null, cy: null };
  if (data) { try { market = JSON.parse(data.marketData); } catch { /* ignore */ } }

  return (
    <DigestCtx.Provider value={ctxValue}>
      {/* 只有有持仓时显示大盘条 */}
      {hasHolding && (
        <MarketBarUI
          market={market}
          tradeDate={data?.tradeDate ?? null}
          loading={loading}
          error={error}
          onRefresh={() => void fetchDigest(true)}
        />
      )}
      {children}
    </DigestCtx.Provider>
  );
}

// ─── MarketBar UI ───────────────────────────────────────────────────────────

function MarketBarUI({
  market, tradeDate, loading, error, onRefresh,
}: {
  market: MarketMap;
  tradeDate: string | null;
  loading: boolean;
  error: boolean;
  onRefresh: () => void;
}) {
  const items: [string, MarketIndex][] = [
    ["上证", market.sh],
    ["深证", market.sz],
    ["创业板", market.cy],
  ];

  const hasData = market.sh || market.sz || market.cy;

  if (!hasData && !loading && !error) return null;

  return (
    <div
      className="rounded-xl border px-4 py-3 flex items-center justify-between gap-3"
      style={{ backgroundColor: "var(--surface-card)", borderColor: "var(--border-subtle)" }}
    >
      {/* 左：指数 */}
      <div className="flex items-center gap-4 flex-1 min-w-0">
        {loading && !hasData ? (
          <div className="flex items-center gap-2">
            <Loader2 size={13} className="animate-spin" style={{ color: "var(--muted-foreground)" }} />
            <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>加载大盘...</span>
          </div>
        ) : error && !hasData ? (
          <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>大盘数据加载失败</span>
        ) : (
          items.map(([name, d]) => {
            if (!d) return null;
            const up = d.pctChg >= 0;
            const color = up ? "var(--color-up)" : "var(--color-down)";
            return (
              <span key={name} className="text-xs tabular-nums font-medium" style={{ color }}>
                {name} {up ? "+" : ""}{d.pctChg.toFixed(2)}%
              </span>
            );
          })
        )}
      </div>

      {/* 右：日期 + 刷新 + 归档入口 */}
      <div className="flex items-center gap-2 shrink-0">
        {tradeDate && (
          <span className="text-[11px]" style={{ color: "var(--muted-foreground)" }}>
            {formatDateLabel(tradeDate)}
          </span>
        )}
        {loading && <Loader2 size={11} className="animate-spin" style={{ color: "var(--muted-foreground)" }} />}
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); onRefresh(); }}
          className="p-1 rounded hover:bg-[var(--surface-overlay)]"
          title="刷新数据"
        >
          <RefreshCw size={11} style={{ color: "var(--muted-foreground)" }} />
        </button>
        {tradeDate && (
          <Link
            href={`/holdings/digest/${tradeDate}`}
            className="p-1 rounded hover:bg-[var(--surface-overlay)]"
            title="查看完整简报"
          >
            <FileText size={11} style={{ color: "var(--muted-foreground)" }} />
          </Link>
        )}
      </div>
    </div>
  );
}
