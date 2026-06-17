"use client";

import {
  Bell, Search, LogOut, Menu, X,
  LayoutDashboard, FileText, TrendingUp, CalendarDays, Calendar,
  BookOpen, AlertCircle, Calculator, Target, Settings,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useRef, useCallback } from "react";
import { signOut } from "next-auth/react";

type UserInfo = { name: string; email: string } | null;

const mobileNavItems = [
  { label: "仪表板", href: "/", icon: <LayoutDashboard size={18} /> },
  { label: "回顾日历", href: "/calendar", icon: <Calendar size={18} /> },
  { label: "决策卡", href: "/decisions", icon: <FileText size={18} /> },
  { label: "持仓库", href: "/holdings", icon: <TrendingUp size={18} /> },
  { label: "复盘", href: "/reviews", icon: <CalendarDays size={18} /> },
  { label: "月度画像", href: "/portraits", icon: <BookOpen size={18} /> },
  { label: "错误库", href: "/errors", icon: <AlertCircle size={18} /> },
  { label: "计算器", href: "/calculators", icon: <Calculator size={18} /> },
  { label: "目标管理", href: "/goals", icon: <Target size={18} /> },
  { label: "智能预警", href: "/alerts", icon: <Bell size={18} /> },
  { label: "设置", href: "/settings", icon: <Settings size={18} /> },
];

export function Navbar({ user }: { user: UserInfo }) {
  const pathname = usePathname();
  const [alertHigh, setAlertHigh] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/alerts")
      .then((r) => r.json())
      .then((d: { highCount: number }) => setAlertHigh(d.highCount))
      .catch(() => {});
  }, []);

  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
      setMenuOpen(false);
    }
  }, []);

  useEffect(() => {
    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen, handleClickOutside]);

  return (
    <>
    <header
      className="flex items-center justify-between px-4 h-11 shrink-0 border-b"
      style={{
        backgroundColor: "var(--surface-sidebar)",
        borderColor: "var(--border-subtle)",
        boxShadow: "0 1px 2px rgba(0,0,0,0.15)",
      }}
    >
      {/* Left: Hamburger (mobile) + Logo */}
      <div className="flex items-center gap-2">
        <button
          className="md:hidden w-8 h-8 flex items-center justify-center rounded-md transition-colors hover:bg-white/[0.06]"
          style={{ color: "var(--muted-foreground)" }}
          onClick={() => setMobileNavOpen(!mobileNavOpen)}
          aria-label="菜单"
        >
          {mobileNavOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
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
      </div>

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

        {/* User avatar dropdown */}
        <div className="relative ml-1" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="w-7 h-7 rounded-full flex items-center justify-center transition-colors hover:bg-white/[0.06]"
            style={{ backgroundColor: "var(--surface-overlay)" }}
          >
            {user ? (
              <span
                className="text-[10px] font-bold text-white"
                style={{ color: "var(--foreground)" }}
              >
                {user.name.charAt(0).toUpperCase()}
              </span>
            ) : (
              <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>?</span>
            )}
          </button>

          {menuOpen && user && (
            <div
              className="absolute right-0 top-full mt-1 w-44 rounded-lg border shadow-lg py-1 z-50"
              style={{
                backgroundColor: "var(--surface-card)",
                borderColor: "var(--border-subtle)",
              }}
            >
              <div
                className="px-3 py-2 text-xs border-b"
                style={{ borderColor: "var(--border-subtle)" }}
              >
                <div className="font-medium truncate" style={{ color: "var(--foreground)" }}>
                  {user.name}
                </div>
                <div className="truncate mt-0.5" style={{ color: "var(--muted-foreground)" }}>
                  {user.email}
                </div>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors hover:bg-white/[0.05]"
                style={{ color: "var(--muted-foreground)" }}
              >
                <LogOut size={12} />
                退出登录
              </button>
            </div>
          )}
        </div>
      </div>
    </header>

      {/* Mobile nav drawer */}
      {mobileNavOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 top-11 z-40 bg-black/50"
            onClick={() => setMobileNavOpen(false)}
          />
          <nav
            className="md:hidden fixed left-0 top-11 bottom-0 z-50 w-64 overflow-y-auto py-3 px-2 space-y-1"
            style={{ backgroundColor: "var(--surface-sidebar)" }}
          >
            {mobileNavItems.map((item) => {
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileNavOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm ${
                    isActive
                      ? "bg-[var(--sidebar-accent)] text-[var(--foreground)]"
                      : "text-[var(--muted-foreground)] hover:bg-white/[0.05] hover:text-[var(--foreground)]"
                  }`}
                >
                  <span className={`shrink-0 ${isActive ? "text-[var(--brand-blue)]" : ""}`}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </>
      )}
    </>
  );
}
