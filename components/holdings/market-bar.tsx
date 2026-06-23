"use client";

import { useState, useEffect, useMemo, useRef, useCallback, createContext, useContext } from "react";
import { Loader2, RefreshCw, FileText, X } from "lucide-react";
import type { TechnicalResult, SignalSummary } from "@/lib/technical/types";
import { summarize } from "@/lib/technical/signals";
import { DigestContent } from "@/components/holdings/digest-content";
import { DigestShareButton } from "@/components/holdings/digest-share-button";
import type { MarketIndexResponse } from "@/app/api/market/index/route";

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

type MarketIndex = { last: number; pctChg: number } | null;
type MarketMap = { sh: MarketIndex; sz: MarketIndex; cy: MarketIndex };

type DigestData = {
  tradeDate: string;
  stockAnalyses: string;
  digestText?: string;
  marketData?: string;
};

const POLL_INTERVAL_MS = 30_000;
const EMPTY_MARKET: MarketMap = { sh: null, sz: null, cy: null };

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
  const [market, setMarket] = useState<MarketMap>(EMPTY_MARKET);
  const [marketLoading, setMarketLoading] = useState(false);
  const [marketError, setMarketError] = useState(false);
  const inFlightMarket = useRef(false);

  const fetchDigest = async (refresh = false) => {
    setLoading(true);
    setError(false);
    try {
      const url = refresh ? "/api/digest?refresh=1" : "/api/digest?mode=cached";
      const res = await fetch(url);
      if (res.status === 404 && !refresh) {
        const genRes = await fetch("/api/digest");
        if (genRes.ok) setData(await genRes.json());
        else setError(true);
        return;
      }
      if (!res.ok) { setError(true); return; }
      const json = await res.json();
      setData(json);
      if (json.stale && !refresh) {
        fetch("/api/digest").then(r => r.ok ? r.json() : null).then(d => { if (d) setData(d); }).catch(() => {});
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const fetchMarket = async () => {
    if (inFlightMarket.current) return;
    inFlightMarket.current = true;
    setMarketLoading(true);
    try {
      const res = await fetch("/api/market/index");
      if (!res.ok) { setMarketError(true); return; }
      const json = (await res.json()) as MarketIndexResponse;
      const next: MarketMap = {
        sh: json.sh ? { last: json.sh.last, pctChg: json.sh.pctChg } : null,
        sz: json.sz ? { last: json.sz.last, pctChg: json.sz.pctChg } : null,
        cy: json.cy ? { last: json.cy.last, pctChg: json.cy.pctChg } : null,
      };
      setMarket(next);
      if (next.sh || next.sz || next.cy) setMarketError(false);
    } catch {
      setMarketError(true);
    } finally {
      setMarketLoading(false);
      inFlightMarket.current = false;
    }
  };

  useEffect(() => {
    if (hasHolding) void fetchDigest(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasHolding]);

  useEffect(() => {
    if (!hasHolding) return;
    void fetchMarket();

    let timer: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      if (timer) return;
      timer = setInterval(() => { void fetchMarket(); }, POLL_INTERVAL_MS);
    };
    const stop = () => {
      if (timer) { clearInterval(timer); timer = null; }
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void fetchMarket();
        start();
      } else {
        stop();
      }
    };

    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
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

  const [drawerOpen, setDrawerOpen] = useState(false);

  const openDrawer = useCallback(() => {
    if (!data?.tradeDate) return;
    if (!data.digestText) {
      fetch(`/api/digest?date=${data.tradeDate}`)
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (d) setData(d); })
        .catch(() => {});
    }
    setDrawerOpen(true);
  }, [data]);

  return (
    <DigestCtx.Provider value={ctxValue}>
      {hasHolding && (
        <MarketBarUI
          market={market}
          tradeDate={data?.tradeDate ?? null}
          loading={loading || marketLoading}
          error={(error && !data) || (marketError && !market.sh && !market.sz && !market.cy)}
          onRefresh={() => { void fetchDigest(true); void fetchMarket(); }}
          onOpenDigest={openDrawer}
        />
      )}
      {drawerOpen && data?.tradeDate && (
        <DigestDrawer
          tradeDate={data.tradeDate}
          digestText={data.digestText ?? null}
          marketData={data.marketData ?? "{}"}
          stockAnalyses={data.stockAnalyses}
          onClose={() => setDrawerOpen(false)}
        />
      )}
      {children}
    </DigestCtx.Provider>
  );
}

// ─── MarketBar UI ───────────────────────────────────────────────────────────

function MarketBarUI({
  market, tradeDate, loading, error, onRefresh, onOpenDigest,
}: {
  market: MarketMap;
  tradeDate: string | null;
  loading: boolean;
  error: boolean;
  onRefresh: () => void;
  onOpenDigest: () => void;
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
          <button
            type="button"
            onClick={onOpenDigest}
            className="p-1 rounded hover:bg-[var(--surface-overlay)]"
            title="查看完整简报"
          >
            <FileText size={11} style={{ color: "var(--muted-foreground)" }} />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Digest Drawer ─────────────────────────────────────────────────────────

function DigestDrawer({
  tradeDate, digestText, marketData, stockAnalyses, onClose,
}: {
  tradeDate: string;
  digestText: string | null;
  marketData: string;
  stockAnalyses: string;
  onClose: () => void;
}) {
  const dateStr = `${tradeDate.slice(0, 4)}-${tradeDate.slice(4, 6)}-${tradeDate.slice(6, 8)}`;
  const weekDays = ["日", "一", "二", "三", "四", "五", "六"];
  const dateObj = new Date(Number(tradeDate.slice(0, 4)), Number(tradeDate.slice(4, 6)) - 1, Number(tradeDate.slice(6, 8)));
  const weekDay = weekDays[dateObj.getDay()];

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      {/* drawer panel */}
      <div
        className="relative w-full max-w-md h-full overflow-y-auto animate-slide-in-right"
        style={{ backgroundColor: "var(--background)" }}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 border-b" style={{ backgroundColor: "var(--background)", borderColor: "var(--border-subtle)" }}>
          <div>
            <h2 className="text-base font-bold" style={{ color: "var(--foreground)" }}>
              盘后简报 · {dateStr}（周{weekDay}）
            </h2>
            <p className="text-[11px]" style={{ color: "var(--muted-foreground)" }}>
              基于技术指标和公开信息自动生成
            </p>
          </div>
          <div className="flex items-center gap-2">
            <DigestShareButton tradeDate={tradeDate} />
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-[var(--surface-overlay)]"
            >
              <X size={16} style={{ color: "var(--muted-foreground)" }} />
            </button>
          </div>
        </div>

        <div className="px-4 py-5 space-y-4">
          {digestText ? (
            <DigestContent
              digestText={digestText}
              marketData={marketData}
              stockAnalyses={stockAnalyses}
            />
          ) : (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={20} className="animate-spin" style={{ color: "var(--muted-foreground)" }} />
              <span className="ml-2 text-sm" style={{ color: "var(--muted-foreground)" }}>加载简报中...</span>
            </div>
          )}

          <div
            className="rounded-lg p-3 text-[11px] leading-relaxed"
            style={{ backgroundColor: "var(--surface-overlay)", color: "var(--muted-foreground)" }}
          >
            ⚠️ 以上分析基于技术指标和公开信息自动生成，仅供复盘参考，不构成任何投资建议。
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slide-in-right {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.25s ease-out;
        }
      `}</style>
    </div>
  );
}
