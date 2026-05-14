"use client";

import { Bell, Search, User } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export function Navbar() {
  const [alertHigh, setAlertHigh] = useState(0);

  useEffect(() => {
    fetch("/api/alerts")
      .then((r) => r.json())
      .then((d: { highCount: number }) => setAlertHigh(d.highCount))
      .catch(() => {});
  }, []);

  return (
    <header
      className="flex items-center justify-between px-4 h-11 shrink-0 border-b"
      style={{
        backgroundColor: "var(--surface-sidebar)",
        borderColor: "var(--border-subtle)",
        boxShadow: "0 1px 2px rgba(0,0,0,0.15)",
      }}
    >
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2 select-none">
        <div
          className="w-6 h-6 rounded-md flex items-center justify-center text-white text-xs font-bold"
          style={{ backgroundColor: "var(--brand-blue)" }}
        >
          T
        </div>
        <span
          className="text-sm font-semibold tracking-tight"
          style={{ color: "var(--foreground)" }}
        >
          TradeMirror
        </span>
      </Link>

      {/* Right actions */}
      <div className="flex items-center gap-0.5">
        {/* Search */}
        <button
          className="w-8 h-8 flex items-center justify-center rounded-md transition-colors hover:bg-white/[0.06]"
          style={{ color: "var(--muted-foreground)" }}
          aria-label="搜索"
        >
          <Search size={14} />
        </button>

        {/* Bell → /alerts with badge */}
        <Link
          href="/alerts"
          className="relative w-8 h-8 flex items-center justify-center rounded-md transition-colors hover:bg-white/[0.06]"
          style={{ color: "var(--muted-foreground)" }}
          aria-label="预警"
        >
          <Bell size={14} />
          {alertHigh > 0 && (
            <span
              className="absolute top-1 right-1 w-2 h-2 rounded-full border border-[var(--surface-sidebar)]"
              style={{ backgroundColor: "var(--brand-red)" }}
            />
          )}
        </Link>

        {/* Avatar */}
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center ml-1"
          style={{ backgroundColor: "var(--surface-overlay)" }}
        >
          <User size={13} style={{ color: "var(--muted-foreground)" }} />
        </div>
      </div>
    </header>
  );
}
