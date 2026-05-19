"use client";

import { useState, useRef, useEffect, useCallback } from "react";

export type StockItem = {
  code: string;
  name: string;
  market: "SH" | "SZ" | "BJ";
};

const MARKET_LABELS: Record<string, string> = { SH: "沪", SZ: "深", BJ: "北" };
const CACHE_MAX = 10;

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
  const [fetchError, setFetchError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const abortRef = useRef<AbortController | null>(null);
  const cacheRef = useRef<Map<string, StockItem[]>>(new Map());
  const inputRef = useRef<HTMLInputElement>(null);
  const suppressBlurRef = useRef(false);

  const search = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) {
      setResults([]);
      setOpen(false);
      setFetchError(false);
      return;
    }

    // Check cache first (LRU: re-insert on hit to mark as recently used)
    const cached = cacheRef.current.get(trimmed);
    if (cached) {
      cacheRef.current.delete(trimmed);
      cacheRef.current.set(trimmed, cached);
      setResults(cached);
      setOpen(cached.length > 0);
      setActiveIdx(-1);
      setLoading(false);
      setFetchError(false);
      return;
    }

    // Cancel previous in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setFetchError(false);
    try {
      const res = await fetch(`/api/stocks/search?q=${encodeURIComponent(trimmed)}`, {
        signal: controller.signal,
      });
      if (res.ok) {
        const data: StockItem[] = await res.json();
        // Evict least-recently-used entry (first key in insertion order)
        if (cacheRef.current.size >= CACHE_MAX) {
          const firstKey = cacheRef.current.keys().next().value;
          if (firstKey !== undefined) cacheRef.current.delete(firstKey);
        }
        cacheRef.current.set(trimmed, data);
        setResults(data);
        setOpen(data.length > 0);
        setActiveIdx(-1);
        setFetchError(false);
      } else {
        setResults([]);
        setOpen(false);
        setFetchError(false);
      }
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setFetchError(true);
      // Try cache with partial match
      for (const [key, val] of cacheRef.current) {
        if (key.includes(trimmed) || trimmed.includes(key)) {
          setResults(val);
          setOpen(val.length > 0);
          setActiveIdx(-1);
          return;
        }
      }
      setResults([]);
      setOpen(false);
    } finally {
      if (controller === abortRef.current) {
        setLoading(false);
      }
    }
  }, []);

  function handleChange(value: string) {
    setQuery(value);
    setFetchError(false);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => search(value), 300);
  }

  function handleSelect(item: StockItem) {
    setQuery(`${item.code} ${item.name}`);
    setOpen(false);
    setFetchError(false);
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

  useEffect(() => {
    return () => {
      clearTimeout(timerRef.current);
      abortRef.current?.abort();
    };
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => {
          if (results.length > 0 || fetchError) setOpen(true);
        }}
        onBlur={handleBlur}
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
          {fetchError && results.length === 0 ? (
            <div
              className="px-3 py-2 text-xs"
              style={{ color: "var(--muted-foreground)" }}
            >
              搜索暂时不可用，请手动输入
            </div>
          ) : results.length > 0 ? (
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
          {fetchError && results.length > 0 && (
            <div
              className="px-3 py-1.5 text-[10px] border-t"
              style={{ color: "var(--color-warning)", borderColor: "var(--border-subtle)" }}
            >
              网络异常，显示缓存结果
            </div>
          )}
        </div>
      )}
    </div>
  );
}
