import Link from "next/link";
import { Plus, TrendingUp, BarChart3, FileText, AlertTriangle, CalendarDays } from "lucide-react";
import { getDecisions } from "@/lib/db/queries/decisions";
import { getHoldings } from "@/lib/db/queries/holdings";
import { getReviewByWeekStart, createReview } from "@/lib/db/queries/reviews";
import { getWeekStart, getWeekEnd, formatWeekLabel } from "@/lib/week";
import { ACTION_LABELS } from "@/types/decision";
import dayjs from "dayjs";

export const dynamic = "force-dynamic";

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 6) return "深夜了，注意休息";
  if (h < 9) return "早安，今天保持纪律";
  if (h < 12) return "上午好，市场开盘了";
  if (h < 14) return "午间，避免追高";
  if (h < 18) return "下午好，冷静操作";
  return "晚上好，复盘一下今天";
}

export default async function HomePage() {
  const [decisions, holdings] = await Promise.all([
    getDecisions(200),
    getHoldings(),
  ]);

  // Current week review
  const weekStart = getWeekStart(dayjs()).valueOf();
  const weekEnd = getWeekEnd(dayjs()).valueOf();
  let currentReview = await getReviewByWeekStart(weekStart);
  if (!currentReview) currentReview = await createReview(weekStart, weekEnd);

  // Stats
  const activeHoldings = holdings.filter((h) => h.status === "HOLDING").length;
  const dangerTotal = decisions.filter((d) => d.dangerSignals.length > 0).length;
  const weekDecisions = decisions.filter(
    (d) => d.createdAt >= weekStart && d.createdAt <= weekEnd
  );
  const reviewPending = currentReview.status === "DRAFT";

  const stats = [
    {
      label: "总决策数",
      value: decisions.length === 0 ? "—" : String(decisions.length),
      sub: "笔记录",
      color: "var(--foreground)",
    },
    {
      label: "本周操作",
      value: String(weekDecisions.length),
      sub: "笔",
      color: weekDecisions.length > 2 ? "var(--brand-warning)" : "var(--foreground)",
    },
    {
      label: "活跃持仓",
      value: activeHoldings === 0 ? "—" : String(activeHoldings),
      sub: "只股票",
      color: "var(--foreground)",
    },
    {
      label: "高危交易",
      value: dangerTotal === 0 ? "0" : String(dangerTotal),
      sub: "累计笔数",
      color: dangerTotal > 0 ? "var(--brand-warning)" : "var(--brand-green)",
    },
  ];

  const quickActions = [
    {
      href: "/decisions/new",
      icon: <FileText size={18} />,
      label: "新建决策卡",
      desc: "记录这笔交易的思考过程",
      accent: "var(--brand-blue)",
      accentDim: "var(--brand-blue-dim)",
    },
    {
      href: "/holdings",
      icon: <TrendingUp size={18} />,
      label: "查看持仓",
      desc: `${activeHoldings} 只活跃持仓`,
      accent: "var(--brand-green)",
      accentDim: "rgba(34,197,94,0.12)",
    },
    {
      href: "/analytics",
      icon: <BarChart3 size={18} />,
      label: "数据分析",
      desc: "深入了解你的交易模式",
      accent: "var(--brand-purple)",
      accentDim: "rgba(139,92,246,0.12)",
    },
  ];

  const recent = decisions.slice(0, 5);

  return (
    <div className="px-4 py-5 sm:px-6 sm:py-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>
          {getGreeting()}
        </h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--muted-foreground)" }}>
          {formatWeekLabel(weekStart)} · {dayjs().format("YYYY年MM月DD日")}
        </p>
      </div>

      {/* Review reminder banner */}
      {reviewPending && (
        <Link
          href={`/reviews/${currentReview.id}`}
          className="flex items-start sm:items-center gap-3 rounded-xl border px-4 py-3 transition-all hover:opacity-90"
          style={{
            backgroundColor: "rgba(245,158,11,0.07)",
            borderColor: "rgba(245,158,11,0.25)",
          }}
        >
          <CalendarDays size={15} className="mt-0.5 sm:mt-0 shrink-0" style={{ color: "var(--brand-warning)" }} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold leading-tight" style={{ color: "var(--brand-warning)" }}>
              本周复盘未完成
            </p>
            <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>
              {formatWeekLabel(weekStart)} · 点击开始 →
            </p>
          </div>
        </Link>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-xl px-4 py-4 border"
            style={{ backgroundColor: "var(--surface-card)", borderColor: "var(--border-subtle)" }}
          >
            <div className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</div>
            <div className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>{s.label}</div>
            <div className="text-[11px] mt-0.5 opacity-50" style={{ color: "var(--muted-foreground)" }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div>
        <p className="section-label mb-3">快速操作</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {quickActions.map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className="card-interactive flex items-start gap-3 rounded-xl border px-4 py-4"
            >
              <div
                className="mt-0.5 w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                style={{ backgroundColor: a.accentDim, color: a.accent }}
              >
                {a.icon}
              </div>
              <div>
                <div className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>{a.label}</div>
                <div className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>{a.desc}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent activity */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="section-label">最近活动</p>
          {decisions.length > 5 && (
            <Link href="/decisions" className="text-xs font-medium" style={{ color: "var(--brand-blue)" }}>
              查看全部 →
            </Link>
          )}
        </div>

        {recent.length === 0 ? (
          <div
            className="rounded-xl border flex flex-col items-center justify-center py-16 text-center"
            style={{ backgroundColor: "var(--surface-card)", borderColor: "var(--border-subtle)" }}
          >
            <div
              className="w-11 h-11 rounded-full flex items-center justify-center mb-4"
              style={{ backgroundColor: "var(--brand-blue-dim)" }}
            >
              <FileText size={18} style={{ color: "var(--brand-blue)" }} />
            </div>
            <p className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>还没有任何记录</p>
            <p className="text-xs mt-1 mb-5" style={{ color: "var(--muted-foreground)" }}>
              创建第一张决策卡，开始追踪你的交易
            </p>
            <Link
              href="/decisions/new"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white"
              style={{ backgroundColor: "var(--brand-blue)" }}
            >
              <Plus size={14} />
              新建决策卡
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {recent.map((d) => {
              const isBuy = d.action === "BUY" || d.action === "ADD";
              const actionColor = isBuy ? "var(--brand-red)" : "var(--brand-green)";
              return (
                <Link
                  key={d.id}
                  href={`/decisions/${d.id}`}
                  className="card-interactive flex items-center gap-3 rounded-xl border px-4 py-3"
                >
                  <span
                    className="text-[11px] font-bold px-2 py-1 rounded-md shrink-0"
                    style={{ backgroundColor: `${actionColor}18`, color: actionColor }}
                  >
                    {ACTION_LABELS[d.action]}
                  </span>
                  <span className="text-sm font-semibold w-20 shrink-0" style={{ color: "var(--foreground)" }}>
                    {d.stockName}
                  </span>
                  <span className="flex-1 text-xs truncate" style={{ color: "var(--muted-foreground)" }}>
                    {d.reason}
                  </span>
                  {d.dangerSignals.length > 0 && (
                    <AlertTriangle size={12} className="shrink-0" style={{ color: "var(--brand-warning)" }} />
                  )}
                  <span className="text-[11px] shrink-0 tabular-nums" style={{ color: "var(--muted-foreground)" }}>
                    {dayjs(d.createdAt).format("MM/DD")}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
