"use client";

import { useState, useEffect } from "react";

type StockInfo = {
  stockCode: string;
  stockMarket: "SH" | "SZ" | "BJ";
};

function marketPrefix(market: string): string {
  if (market === "SH") return "sh";
  if (market === "BJ") return "bj";
  return "sz";
}

/**
 * Batch-fetch current prices for a list of stocks.
 * Returns a Map<stockCode, price>.
 */
export function useStockPrices(stocks: StockInfo[]): Map<string, number> {
  const [prices, setPrices] = useState<Map<string, number>>(new Map());

  // Stable key for the dependency
  const key = stocks.map((s) => s.stockCode).sort().join(",");

  useEffect(() => {
    if (stocks.length === 0) return;

    const codes = stocks.map((s) => `${marketPrefix(s.stockMarket)}${s.stockCode}`);
    // Deduplicate
    const unique = [...new Set(codes)];
    if (unique.length === 0) return;

    let cancelled = false;

    fetch(`/api/stocks/batch-price?stocks=${unique.join(",")}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: Record<string, number> | null) => {
        if (cancelled || !data) return;
        setPrices(new Map(Object.entries(data)));
      })
      .catch(() => {
        // Silently fail — prices are optional enhancement
      });

    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return prices;
}
