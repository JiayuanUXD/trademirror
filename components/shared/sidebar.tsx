"use client";

import {
  LayoutDashboard,
  FileText,
  TrendingUp,
  CalendarDays,
  Calendar,
  BookOpen,
  AlertCircle,
  Calculator,
  Target,
  Settings,
  Bell,
  Activity,
  Filter,
  Users,
  BarChart3,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type NavItem = {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: "Pro";
};

const navItems: NavItem[] = [
  {
    label: "仪表板",
    href: "/",
    icon: <LayoutDashboard size={15} />,
  },
  {
    label: "市场情绪",
    href: "/sentiment",
    icon: <Activity size={15} />,
  },
  {
    label: "选股漏斗",
    href: "/screener",
    icon: <Filter size={15} />,
  },
  {
    label: "回顾日历",
    href: "/calendar",
    icon: <Calendar size={15} />,
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

export function Sidebar({ role }: { role: "admin" | "user" }) {
  const pathname = usePathname();
  const [alertHighCount, setAlertHighCount] = useState(0);

  useEffect(() => {
    const eventSource = new EventSource("/api/alerts/sse");

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setAlertHighCount(data.highCount);
      } catch (e) {
        console.error("SSE parse error", e);
      }
    };

    return () => eventSource.close();
  }, []);

  return (
    <aside
      className="hidden md:flex flex-col h-full md:w-52 shrink-0 border-r transition-all"
      style={{
        backgroundColor: "var(--surface-sidebar)",
        borderColor: "var(--border-subtle)",
      }}
    >
      {/* Nav */}
      <nav className="flex-1 py-3 overflow-y-auto px-1.5 md:px-2 space-y-1">
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname === item.href || pathname.startsWith(item.href + "/");
          const isAlertsItem = item.href === "/alerts";

          return (
            <div key={item.href}>
              <Link
                href={item.href}
                title={item.label}
                className={`nav-item relative flex items-center gap-2.5 px-2.5 md:px-3 py-2.5 rounded-lg text-sm ${
                  isActive
                    ? "bg-[var(--sidebar-accent)] text-[var(--foreground)] shadow-[0_0_0_1px_rgba(61,142,248,0.2)]"
                    : "text-[var(--muted-foreground)] hover:bg-white/[0.05] hover:text-[var(--foreground)]"
                }`}
              >
                <span
                  className={`shrink-0 transition-colors ${
                    isActive ? "text-[var(--brand-blue)]" : ""
                  }`}
                >
                  {item.icon}
                </span>

                <span className="hidden md:block flex-1 truncate">{item.label}</span>

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
                    <span
                      className="hidden md:block text-[10px] px-1.5 py-0.5 rounded-full font-bold min-w-[18px] text-center leading-none"
                      style={{ backgroundColor: "var(--brand-red)", color: "#fff" }}
                    >
                      {alertHighCount}
                    </span>
                    <span
                      className="md:hidden absolute top-1 right-1 w-2 h-2 rounded-full"
                      style={{ backgroundColor: "var(--brand-red)" }}
                    />
                  </>
                )}
              </Link>
            </div>
          );
        })}

        {/* Admin section */}
        {role === "admin" && (
          <>
            <div className="px-2.5 md:px-3 pt-3 pb-1">
              <span
                className="hidden md:block text-[10px] font-semibold uppercase tracking-wider"
                style={{ color: "var(--muted-foreground)" }}
              >
                Admin
              </span>
            </div>
            {[
              { label: "用户管理", href: "/admin/users", icon: <Users size={15} /> },
              { label: "全局统计", href: "/admin/stats", icon: <BarChart3 size={15} /> },
            ].map((item) => {
              const isActive =
                pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <div key={item.href}>
                  <Link
                    href={item.href}
                    title={item.label}
                    className={`nav-item relative flex items-center gap-2.5 px-2.5 md:px-3 py-2.5 rounded-lg text-sm ${
                      isActive
                        ? "bg-[var(--sidebar-accent)] text-[var(--foreground)] shadow-[0_0_0_1px_rgba(61,142,248,0.2)]"
                        : "text-[var(--muted-foreground)] hover:bg-white/[0.05] hover:text-[var(--foreground)]"
                    }`}
                  >
                    <span
                      className={`shrink-0 transition-colors ${
                        isActive ? "text-[var(--brand-blue)]" : ""
                      }`}
                    >
                      {item.icon}
                    </span>
                    <span className="hidden md:block flex-1 truncate">{item.label}</span>
                  </Link>
                </div>
              );
            })}
          </>
        )}
      </nav>

    </aside>
  );
}
