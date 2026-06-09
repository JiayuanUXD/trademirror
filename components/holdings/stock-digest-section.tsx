"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, Loader2, BarChart3, RefreshCw } from "lucide-react";
import type { TechnicalResult } from "@/lib/technical/types";
import { summarize } from "@/lib/technical/signals";
import { StockCard, splitDigestByStock, renderMarkdown, digestStyles } from "./digest-content";

type DigestData = {
  tradeDate: string;
  digestText: string;
  marketData: string;
  stockAnalyses: string;
};

type Props = {
  stockCode: string;
  stockName: string;
};

function formatDateLabel(d: string): string {
  const weekDays = ["日", "一", "二", "三", "四", "五", "六"];
  const date = new Date(Number(d.slice(0, 4)), Number(d.slice(4, 6)) - 1, Number(d.slice(6, 8)));
  return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}（周${weekDays[date.getDay()]}）`;
}

export function StockDigestSection({ stockCode, stockName }: Props) {
  const [data, setData] = useState<DigestData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDigest = async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    try {
      const url = refresh ? "/api/digest?refresh=1" : "/api/digest?mode=cached";
      const res = await fetch(url);
      if (res.status === 404 && !refresh) {
        // 没有缓存，尝试生成
        const genRes = await fetch("/api/digest");
        if (genRes.ok) setData(await genRes.json());
      } else if (res.ok) {
        setData(await res.json());
      }
    } catch { /* ignore */ }
    finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void fetchDigest(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 从全量 digest 中提取本股数据
  const stockData = useMemo(() => {
    if (!data) return null;

    let analyses: TechnicalResult[] = [];
    try { analyses = JSON.parse(data.stockAnalyses) as TechnicalResult[]; } catch { return null; }

    const match = analyses.find((a) => a.stockCode === stockCode);
    if (!match) return null;

    const summary = summarize(match);
    const names = analyses.map((a) => a.stockName);
    const split = splitDigestByStock(data.digestText, names);
    const narrativeHtml = split.perStock.get(stockName) ?? "";
    const footerHtml = split.perStockFooter.get(stockName);

    return { analysis: match, summary, narrativeHtml, footerHtml };
  }, [data, stockCode, stockName]);

  // 加载中 or 无数据
  if (loading) {
    return (
      <div
        className="rounded-xl border p-4 flex items-center gap-3"
        style={{ backgroundColor: "var(--surface-card)", borderColor: "var(--border-subtle)" }}
      >
        <Loader2 size={15} className="animate-spin" style={{ color: "var(--muted-foreground)" }} />
        <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>加载盘后分析...</span>
      </div>
    );
  }

  if (!stockData || !data) return null;

  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{ backgroundColor: "var(--surface-card)", borderColor: "var(--border-subtle)" }}
    >
      {/* Header — 可折叠 */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 transition-colors hover:bg-[var(--surface-overlay)]"
      >
        <div className="flex items-center gap-2">
          <BarChart3 size={14} style={{ color: "var(--brand-blue)" }} />
          <span className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
            今日盘后分析
          </span>
          <span className="text-[11px]" style={{ color: "var(--muted-foreground)" }}>
            {formatDateLabel(data.tradeDate)}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {refreshing && <Loader2 size={11} className="animate-spin" style={{ color: "var(--muted-foreground)" }} />}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); void fetchDigest(true); }}
            className="p-1 rounded hover:bg-[var(--surface-card)]"
            title="刷新分析"
          >
            <RefreshCw size={11} style={{ color: "var(--muted-foreground)" }} />
          </button>
          {expanded ? (
            <ChevronUp size={14} style={{ color: "var(--muted-foreground)" }} />
          ) : (
            <ChevronDown size={14} style={{ color: "var(--muted-foreground)" }} />
          )}
        </div>
      </button>

      {/* Body */}
      {expanded && (
        <div>
          <div className="h-px" style={{ backgroundColor: "var(--border-subtle)" }} />
          <div>
            <StockCard
              t={stockData.analysis}
              summary={stockData.summary}
              narrativeHtml={stockData.narrativeHtml}
              footerHtml={stockData.footerHtml}
              embedded
            />
          </div>

          {/* 查看完整简报 */}
          <div className="px-4 py-2.5" style={{ backgroundColor: "var(--surface-overlay)" }}>
            <Link
              href={`/holdings/digest/${data.tradeDate}`}
              className="text-[11px] font-medium transition-colors hover:underline"
              style={{ color: "var(--brand-blue)" }}
            >
              查看完整简报 →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
