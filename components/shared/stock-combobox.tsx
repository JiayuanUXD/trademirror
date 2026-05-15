"use client";

import { useState, useRef, useEffect, useCallback } from "react";

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
  const [loading, setLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      setOpen(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/stocks/search?q=${encodeURIComponent(q.trim())}`);
      if (res.ok) {
        const data: StockItem[] = await res.json();
        setResults(data);
        setOpen(data.length > 0);
        setActiveIdx(-1);
      }
    } catch {
      // Network error — fail silently, user can still type manually
    } finally {
      setLoading(false);
    }
  }, []);

  function handleChange(value: string) {
    setQuery(value);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => search(value), 300);
  }

  function handleSelect(item: StockItem) {
    setQuery(`${item.code} ${item.name}`);
    setOpen(false);
    onSelect(item);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
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
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    return () => clearTimeout(timerRef.current);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder || "输入股票代码或名称"}
        className="w-full px-3 py-2 rounded-md text-sm outline-none"
        style={{
          backgroundColor: "var(--surface-overlay)",
          color: "var(--foreground)",
          border: "1px solid var(--border-subtle)",
        }}
        autoComplete="off"
      />
      {loading && (
        <div
          className="absolute right-2 top-1/2 -translate-y-1/2 text-xs"
          style={{ color: "var(--muted-foreground)" }}
        >
          ...
        </div>
      )}
      {open && results.length > 0 && (
        <ul
          className="absolute z-50 w-full mt-1 rounded-md border overflow-hidden shadow-lg max-h-60 overflow-y-auto"
          style={{
            backgroundColor: "var(--surface-card)",
            borderColor: "var(--border-subtle)",
          }}
        >
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
      )}
    </div>
  );
}
