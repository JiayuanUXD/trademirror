"use client";

import {
  LayoutDashboard,
  FileText,
  BarChart3,
  TrendingUp,
  CalendarDays,
  BookOpen,
  AlertCircle,
  Calculator,
  Target,
  Settings,
  ChevronRight,
  Plus,
  MessageSquare,
  Bell,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type NavItem = {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: "Pro";
  children?: { label: string; href: string }[];
};

const navItems: NavItem[] = [
  {
    label: "仪表板",
    href: "/dashboard",
    icon: <LayoutDashboard size={15} />,
    children: [
      { label: "概览", href: "/dashboard" },
      { label: "日历", href: "/dashboard/calendar" },
    ],
  },
  {
    label: "决策卡",
    href: "/decisions",
    icon: <FileText size={15} />,
  },
  {
    label: "持仓库",
    href: "/holdings",
    icon: <TrendingUp size={15} />,
  },
  {
    label: "复盘",
    href: "/reviews",
    icon: <CalendarDays size={15} />,
  },
  {
    label: "分析",
    href: "/analytics",
    icon: <BarChart3 size={15} />,
  },
  {
    label: "月度画像",
    href: "/portraits",
    icon: <BookOpen size={15} />,
  },
  {
    label: "错误库",
    href: "/errors",
    icon: <AlertCircle size={15} />,
  },
  {
    label: "计算器",
    href: "/calculators",
    icon: <Calculator size={15} />,
  },
  {
    label: "目标管理",
    href: "/goals",
    icon: <Target size={15} />,
  },
  {
    label: "智能预警",
    href: "/alerts",
    icon: <Bell size={15} />,
  },
  {
    label: "设置",
    href: "/settings",
    icon: <Settings size={15} />,
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [alertHighCount, setAlertHighCount] = useState(0);

  useEffect(() => {
    fetch("/api/alerts")
      .then((r) => r.json())
      .then((data: { highCount: number }) => setAlertHighCount(data.highCount))
      .catch(() => {});
  }, []);

  return (
    <aside
      className="flex flex-col h-full w-14 md:w-52 shrink-0 border-r transition-all"
      style={{
        backgroundColor: "var(--surface-sidebar)",
        borderColor: "var(--border-subtle)",
      }}
    >
      {/* Nav */}
      <nav className="flex-1 py-3 overflow-y-auto px-1.5 md:px-2 space-y-0.5">
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname === item.href || pathname.startsWith(item.href + "/");
          const hasChildren = !!item.children;
          const isAlertsItem = item.href === "/alerts";

          return (
            <div key={item.href}>
              <Link
                href={item.href}
                title={item.label}
                className={`relative flex items-center gap-2.5 px-2.5 md:px-3 py-2 rounded-lg text-sm transition-all duration-150 ${
                  isActive
                    ? "bg-[var(--sidebar-accent)] text-[var(--foreground)]"
                    : "text-[var(--muted-foreground)] hover:bg-white/[0.05] hover:text-[var(--foreground)]"
                }`}
              >
                {/* Icon */}
                <span
                  className={`shrink-0 transition-colors ${
                    isActive ? "text-[var(--brand-blue)]" : ""
                  }`}
                >
                  {item.icon}
                </span>

                {/* Label — hidden on mobile */}
                <span className="hidden md:block flex-1 truncate">{item.label}</span>

                {/* Badges — hidden on mobile */}
                {item.badge && (
                  <span
                    className="hidden md:block text-[10px] px-1.5 py-0.5 rounded font-semibold"
                    style={{ backgroundColor: "var(--brand-blue-dim)", color: "var(--brand-blue)" }}
                  >
                    Pro
                  </span>
                )}
                {isAlertsItem && alertHighCount > 0 && (
                  <>
                    {/* Desktop badge */}
                    <span
                      className="hidden md:block text-[10px] px-1.5 py-0.5 rounded-full font-bold min-w-[18px] text-center leading-none"
                      style={{ backgroundColor: "var(--brand-red)", color: "#fff" }}
                    >
                      {alertHighCount}
                    </span>
                    {/* Mobile dot */}
                    <span
                      className="md:hidden absolute top-1 right-1 w-2 h-2 rounded-full"
                      style={{ backgroundColor: "var(--brand-red)" }}
                    />
                  </>
                )}
                {hasChildren && (
                  <ChevronRight size={11} className="hidden md:block opacity-40 shrink-0" />
                )}
              </Link>

              {/* Inline sub-items (active parent only, desktop only) */}
              {hasChildren && isActive && (
                <div
                  className="hidden md:block ml-5 pl-3 my-1 space-y-0.5"
                  style={{ borderLeft: "1px solid var(--border-subtle)" }}
                >
                  {item.children!.map((child) => (
                    <Link
                      key={child.href}
                      href={child.href}
                      className="flex items-center gap-1.5 px-2 py-1.5 text-xs rounded-md transition-all hover:text-[var(--foreground)] hover:bg-white/[0.04]"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      <span className="w-1 h-1 rounded-full bg-current opacity-50 shrink-0" />
                      {child.label}
                    </Link>
                  ))}
                  <Link
                    href="/decisions/new"
                    className="flex items-center gap-1.5 px-2 py-1.5 text-xs rounded-md transition-all hover:text-[var(--foreground)] hover:bg-white/[0.04]"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    <Plus size={10} />
                    新建
                  </Link>
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer CTA — desktop only */}
      <div className="hidden md:block p-3" style={{ borderTop: "1px solid var(--border-subtle)" }}>
        <a
          href="#"
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all hover:bg-white/[0.04]"
          style={{ backgroundColor: "rgba(88,101,242,0.12)", color: "#818CF8" }}
        >
          <MessageSquare size={12} />
          加入我们的 Discord
        </a>
      </div>
    </aside>
  );
}
