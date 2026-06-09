"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { BarChart3, ChevronRight, Loader2, RefreshCw } from "lucide-react";
import type { TechnicalResult } from "@/lib/technical/types";
import { summarize } from "@/lib/technical/signals";

type DigestData = {
  id: string;
  tradeDate: string;
  digestText: string;
  marketData: string;
  stockAnalyses: string;
  fromCache: boolean;
};

type MarketIndex = { close: number; pctChg: number } | null;
type MarketMap = { sh: MarketIndex; sz: MarketIndex; cy: MarketIndex };

const RATING_LABEL = { bullish: "偏多", neutral: "中性", bearish: "偏空" } as const;
type Rating = keyof typeof RATING_LABEL;

function formatDate(d: string): string {
  const weekDays = ["日", "一", "二", "三", "四", "五", "六"];
  const date = new Date(Number(d.slice(0, 4)), Number(d.slice(4, 6)) - 1, Number(d.slice(6, 8)));
  return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}（周${weekDays[date.getDay()]}）`;
}

function ratingStyle(r: Rating) {
  switch (r) {
    case "bullish": return { color: "var(--color-up)", bg: "rgba(239,68,68,0.1)" };
    case "bearish": return { color: "var(--color-down)", bg: "rgba(34,197,94,0.1)" };
    default: return { color: "var(--muted-foreground)", bg: "rgba(148,163,184,0.08)" };
  }
}

export function DigestSummaryCard() {
  const [data, setData] = useState<DigestData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDigest = async (forceRefresh = false) => {
    setLoading(true);
    setError(null);
    try {
      const url = forceRefresh ? "/api/digest?refresh=1" : "/api/digest?mode=cached";
      const res = await fetch(url);
      if (res.status === 404 && !forceRefresh) {
        const genRes = await fetch("/api/digest");
        if (genRes.ok) {
          setData(await genRes.json());
        } else {
          setError("生成失败");
        }
        return;
      }
      if (!res.ok) {
        setError("获取失败");
        return;
      }
      setData(await res.json());
    } catch {
      setError("网络错误");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchDigest(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 解析结构化数据
  const parsed = useMemo(() => {
    if (!data) return null;

    let market: MarketMap = { sh: null, sz: null, cy: null };
    try { market = JSON.parse(data.marketData) as MarketMap; } catch { /* ignore */ }

    let analyses: TechnicalResult[] = [];
    try { analyses = JSON.parse(data.stockAnalyses) as TechnicalResult[]; } catch { /* ignore */ }

    const stocks = analyses.map((a) => {
      const s = summarize(a);
      return { code: a.stockCode, name: a.stockName, pctChg: a.quote.pctChg, rating: s.rating as Rating };
    });

    const counts = { bullish: 0, neutral: 0, bearish: 0 };
    for (const s of stocks) counts[s.rating]++;

    return { market, stocks, counts };
  }, [data]);

  if (loading && !data) {
    return (
      <div
        className="rounded-xl border p-4 flex items-center gap-3"
        style={{ backgroundColor: "var(--surface-card)", borderColor: "var(--border-subtle)" }}
      >
        <Loader2 size={18} className="animate-spin" style={{ color: "var(--muted-foreground)" }} />
        <span className="text-sm" style={{ color: "var(--muted-foreground)" }}>正在生成盘后分析...</span>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div
        className="rounded-xl border p-4 flex items-center justify-between"
        style={{ backgroundColor: "var(--surface-card)", borderColor: "var(--border-subtle)" }}
      >
        <div className="flex items-center gap-2">
          <BarChart3 size={16} style={{ color: "var(--muted-foreground)" }} />
          <span className="text-sm" style={{ color: "var(--muted-foreground)" }}>{error}</span>
        </div>
        <button
          onClick={() => void fetchDigest(true)}
          className="text-xs px-2 py-1 rounded"
          style={{ color: "var(--brand-blue)" }}
        >
          重试
        </button>
      </div>
    );
  }

  if (!data || !data.tradeDate || !parsed) return null;
  const { market, stocks, counts } = parsed;

  return (
    <Link
      href={`/holdings/digest/${data.tradeDate}`}
      className="block rounded-xl border overflow-hidden transition-colors hover:border-[var(--brand-blue)]"
      style={{ backgroundColor: "var(--surface-card)", borderColor: "var(--border-subtle)" }}
    >
      {/* 头部 */}
      <div className="p-4 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 size={16} style={{ color: "var(--brand-blue)" }} />
            <span className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
              盘后简报
            </span>
            <span className="text-[11px]" style={{ color: "var(--muted-foreground)" }}>
              {formatDate(data.tradeDate)}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {loading && <Loader2 size={12} className="animate-spin" style={{ color: "var(--muted-foreground)" }} />}
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); void fetchDigest(true); }}
              className="p-1 rounded hover:bg-[var(--surface-overlay)]"
              title="重新生成"
            >
              <RefreshCw size={12} style={{ color: "var(--muted-foreground)" }} />
            </button>
            <ChevronRight size={14} style={{ color: "var(--muted-foreground)" }} />
          </div>
        </div>

        {/* 三大指数 */}
        <div className="flex items-center gap-4 mt-2.5">
          {([["上证", market.sh], ["深证", market.sz], ["创业板", market.cy]] as const).map(([name, d]) => {
            if (!d) return <span key={name} className="text-[11px]" style={{ color: "var(--muted-foreground)" }}>{name} --</span>;
            const up = d.pctChg >= 0;
            const color = up ? "var(--color-up)" : "var(--color-down)";
            return (
              <span key={name} className="text-xs tabular-nums font-medium" style={{ color }}>
                {name} {up ? "+" : ""}{d.pctChg.toFixed(2)}%
              </span>
            );
          })}
        </div>
      </div>

      {/* 个股条 */}
      {stocks.length > 0 && (
        <div className="px-4 pb-3 space-y-1.5">
          {stocks.map((s) => {
            const up = s.pctChg >= 0;
            const priceColor = up ? "var(--color-up)" : "var(--color-down)";
            const rs = ratingStyle(s.rating);
            return (
              <div key={s.code} className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-medium truncate" style={{ color: "var(--foreground)" }}>{s.name}</span>
                  <span className="text-[10px] tabular-nums" style={{ color: "var(--muted-foreground)" }}>{s.code}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs tabular-nums font-medium" style={{ color: priceColor }}>
                    {up ? "+" : ""}{s.pctChg.toFixed(2)}%
                  </span>
                  <span
                    className="text-[10px] font-semibold px-1.5 py-px rounded"
                    style={{ color: rs.color, backgroundColor: rs.bg }}
                  >
                    {RATING_LABEL[s.rating]}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 底部汇总条 */}
      {stocks.length > 0 && (
        <div
          className="px-4 py-2 flex items-center gap-3 text-[11px]"
          style={{ backgroundColor: "var(--surface-overlay)" }}
        >
          <span style={{ color: "var(--muted-foreground)" }}>{stocks.length}只持仓</span>
          {counts.bullish > 0 && (
            <span className="font-medium" style={{ color: "var(--color-up)" }}>{counts.bullish} 偏多</span>
          )}
          {counts.neutral > 0 && (
            <span style={{ color: "var(--muted-foreground)" }}>{counts.neutral} 中性</span>
          )}
          {counts.bearish > 0 && (
            <span className="font-medium" style={{ color: "var(--color-down)" }}>{counts.bearish} 偏空</span>
          )}
        </div>
      )}
    </Link>
  );
}
