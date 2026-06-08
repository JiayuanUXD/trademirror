"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { loadStockList, searchStocks, type StockData } from "@/lib/stock-search";

export type StockItem = {
  code: string;
  name: string;
  market: "SH" | "SZ" | "BJ";
};

const MARKET_LABELS: Record<string, string> = { SH: "沪", SZ: "深", BJ: "北" };

type Props = {
  onSelect: (stock: StockItem) => void;
  initialCode?: string;
  initialName?: string;
  placeholder?: string;
};

export function StockCombobox({ onSelect, initialCode, initialName, placeholder }: Props) {
  const [query, setQuery] = useState(
    initialCode && initialName ? `${initialCode} ${initialName}` : initialCode || initialName || ""
  );
  const [results, setResults] = useState<StockItem[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [listReady, setListReady] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const suppressBlurRef = useRef(false);
  const stockListRef = useRef<StockData[]>([]);

  // Preload stock list on mount
  useEffect(() => {
    loadStockList().then((list) => {
      stockListRef.current = list;
      setListReady(list.length > 0);
    });
  }, []);

  const search = useCallback((q: string) => {
    const trimmed = q.trim();
    if (!trimmed) {
      setResults([]);
      setOpen(false);
      return;
    }

    const matches = searchStocks(trimmed, stockListRef.current, 10);
    const items: StockItem[] = matches.map((s) => ({
      code: s.c,
      name: s.n,
      market: s.m,
    }));

    setResults(items);
    setOpen(items.length > 0);
    setActiveIdx(-1);
  }, []);

  function handleChange(value: string) {
    setQuery(value);
    // Local search is instant — no debounce needed
    search(value);
  }

  function handleSelect(item: StockItem) {
    setQuery(`${item.code} ${item.name}`);
    setOpen(false);
    onSelect(item);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && activeIdx >= 0) {
      e.preventDefault();
      handleSelect(results[activeIdx]);
    }
  }

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Prevent blur from closing dropdown when tapping items on mobile
  function handleBlur() {
    if (suppressBlurRef.current) {
      suppressBlurRef.current = false;
      inputRef.current?.focus();
      return;
    }
    setTimeout(() => {
      if (!suppressBlurRef.current) setOpen(false);
    }, 150);
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => {
          if (results.length > 0) setOpen(true);
        }}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder || (listReady ? "代码/名称/拼音首字母（如 zgjs）" : "加载股票列表中...")}
        className="w-full px-3 py-2 rounded-md text-sm outline-none"
        style={{
          backgroundColor: "var(--surface-overlay)",
          color: "var(--foreground)",
          border: "1px solid var(--border-subtle)",
        }}
        autoComplete="off"
      />
      {open && (
        <div
          className="absolute z-50 w-full mt-1 rounded-md border overflow-hidden shadow-lg max-h-60 overflow-y-auto"
          style={{
            backgroundColor: "var(--surface-card)",
            borderColor: "var(--border-subtle)",
          }}
          onMouseDown={() => { suppressBlurRef.current = true; }}
          onTouchStart={() => { suppressBlurRef.current = true; }}
        >
          {results.length > 0 ? (
            <ul>
              {results.map((item, idx) => (
                <li
                  key={item.code}
                  onMouseDown={() => handleSelect(item)}
                  onMouseEnter={() => setActiveIdx(idx)}
                  className="flex items-center gap-2 px-3 py-2 cursor-pointer text-sm"
                  style={{
                    backgroundColor: idx === activeIdx ? "var(--surface-overlay)" : "transparent",
                    color: "var(--foreground)",
                  }}
                >
                  <span className="font-mono text-xs w-14 shrink-0" style={{ color: "var(--brand-blue)" }}>
                    {item.code}
                  </span>
                  <span className="flex-1 truncate">{item.name}</span>
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0"
                    style={{ backgroundColor: "rgba(148,163,184,0.12)", color: "var(--muted-foreground)" }}
                  >
                    {MARKET_LABELS[item.market]}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      )}
    </div>
  );
}
