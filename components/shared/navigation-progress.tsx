"use client";

/**
 * Thin blue progress bar at the top of the viewport.
 * - Starts on any internal link click (before the server round-trip)
 * - Completes when usePathname() changes (data arrived, page rendered)
 */

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

export function NavigationProgress() {
  const pathname = usePathname();
  const [width, setWidth]     = useState(0);
  const [visible, setVisible] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef  = useRef<ReturnType<typeof setTimeout>  | null>(null);
  const isMounted   = useRef(false);
  const isLoading   = useRef(false);

  function clearTimers() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (timeoutRef.current)  clearTimeout(timeoutRef.current);
  }

  function startBar() {
    if (isLoading.current) return; // already running
    isLoading.current = true;
    clearTimers();
    setVisible(true);
    setWidth(8);

    let w = 8;
    intervalRef.current = setInterval(() => {
      // Fast early, then exponentially slower as it nears 88%
      const step = w < 35 ? 12 : w < 60 ? 6 : w < 80 ? 2.5 : 0.8;
      w = Math.min(w + step, 88);
      setWidth(w);
      if (w >= 88) clearInterval(intervalRef.current!);
    }, 300);
  }

  function finishBar() {
    if (!isLoading.current) return;
    isLoading.current = false;
    clearTimers();
    setWidth(100);
    timeoutRef.current = setTimeout(() => {
      setVisible(false);
      setWidth(0);
    }, 350);
  }

  // Detect internal link clicks → start bar immediately (before data arrives)
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const anchor = (e.target as HTMLElement).closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;
      const href = anchor.getAttribute("href") ?? "";
      // Skip external links, hash links, and new-tab links
      if (
        href.startsWith("http") ||
        href.startsWith("//")   ||
        href.startsWith("#")    ||
        anchor.target === "_blank"
      ) return;
      startBar();
    }
    document.addEventListener("click", onDocClick, true);
    return () => document.removeEventListener("click", onDocClick, true);
  }, []);

  // Detect navigation completion → finish the bar
  useEffect(() => {
    if (!isMounted.current) {
      isMounted.current = true;
      return; // skip initial mount
    }
    finishBar();
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!visible) return null;

  return (
    <div
      aria-hidden
      className="fixed top-0 left-0 right-0 z-[9999] h-[2px] pointer-events-none"
    >
      <div
        style={{
          height: "100%",
          width: `${width}%`,
          backgroundColor: "var(--brand-blue)",
          boxShadow: "0 0 8px 1px var(--brand-blue)",
          transition: width >= 100
            ? "width 0.12s ease-out"
            : "width 0.3s ease-out",
        }}
      />
    </div>
  );
}
