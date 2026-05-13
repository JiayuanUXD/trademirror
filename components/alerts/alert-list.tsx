"use client";

/**
 * AlertList — 客户端组件
 *
 * 功能：
 * - 渲染预警列表（分行为 / 持仓两个区块）
 * - 支持"已知晓"单条关闭，状态持久化到 localStorage
 * - 支持显示/隐藏已关闭的预警
 */

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  TrendingDown,
  BarChart2,
  Target,
  ChevronRight,
  X,
  Eye,
  EyeOff,
  CheckCircle,
} from "lucide-react";
import type { Alert, AlertSeverity, AlertCategory } from "@/lib/alerts";

// ─── 配置 ─────────────────────────────────────────────────────────────────────

const SEVERITY_CONFIG: Record<
  AlertSeverity,
  { label: string; bg: string; border: string; color: string }
> = {
  HIGH:   { label: "高",  bg: "rgba(239,68,68,0.08)",  border: "rgba(239,68,68,0.25)",  color: "var(--brand-red)" },
  MEDIUM: { label: "中",  bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.25)", color: "var(--brand-warning)" },
  LOW:    { label: "低",  bg: "rgba(99,102,241,0.06)", border: "rgba(99,102,241,0.2)",  color: "var(--brand-purple)" },
};

const CATEGORY_CONFIG: Record<
  AlertCategory,
  { label: string; icon: React.ReactNode }
> = {
  BEHAVIOR: { label: "行为预警", icon: <TrendingDown size={14} /> },
  POSITION: { label: "持仓预警", icon: <BarChart2 size={14} /> },
  GOAL:     { label: "目标预警", icon: <Target size={14} /> },
};

const DISMISSED_KEY = "trademirror_dismissed_alerts";

// ─── localStorage 工具 ────────────────────────────────────────────────────────

function loadDismissed(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

function saveDismissed(set: Set<string>) {
  try {
    localStorage.setItem(DISMISSED_KEY, JSON.stringify([...set]));
  } catch {
    // ignore storage errors
  }
}

// ─── AlertCard ────────────────────────────────────────────────────────────────

function AlertCard({
  alert,
  onDismiss,
  isDismissed,
}: {
  alert: Alert;
  onDismiss: () => void;
  isDismissed?: boolean;
}) {
  const sev = SEVERITY_CONFIG[alert.severity];
  const cat = CATEGORY_CONFIG[alert.category];

  const inner = (
    <div
      className="rounded-xl p-4 flex items-start gap-3 transition-colors"
      style={{
        backgroundColor: isDismissed ? "var(--surface-card)" : sev.bg,
        border: `1px solid ${isDismissed ? "var(--border-subtle)" : sev.border}`,
      }}
    >
      {/* 图标 */}
      <div className="mt-0.5 shrink-0">
        {isDismissed ? (
          <CheckCircle size={16} style={{ color: "var(--muted-foreground)" }} />
        ) : (
          <AlertTriangle size={16} style={{ color: sev.color }} />
        )}
      </div>

      <div className="flex-1 min-w-0">
        {/* 分类 + 严重性 标签 */}
        <div className="flex items-center gap-2 mb-1">
          <span
            className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-medium"
            style={{
              backgroundColor: isDismissed ? "var(--surface-overlay)" : sev.border,
              color: isDismissed ? "var(--muted-foreground)" : sev.color,
            }}
          >
            {cat.icon}
            {cat.label}
          </span>
          <span
            className="text-[10px] px-1.5 py-0.5 rounded font-medium"
            style={{
              backgroundColor: isDismissed ? "var(--surface-overlay)" : sev.border,
              color: isDismissed ? "var(--muted-foreground)" : sev.color,
            }}
          >
            {sev.label}危
          </span>
          {isDismissed && (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded"
              style={{ backgroundColor: "var(--surface-overlay)", color: "var(--muted-foreground)" }}
            >
              已知晓
            </span>
          )}
        </div>

        {/* 标题 */}
        <p
          className="text-sm font-semibold mb-1"
          style={{ color: isDismissed ? "var(--muted-foreground)" : "var(--foreground)" }}
        >
          {alert.title}
        </p>

        {/* 详情 */}
        <p className="text-xs leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
          {alert.detail}
        </p>
      </div>

      <div className="flex items-start gap-1 shrink-0">
        {/* 已知晓 / 撤销 按钮 */}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDismiss();
          }}
          className="p-1 rounded-md transition-colors"
          style={{ color: "var(--muted-foreground)" }}
          title={isDismissed ? "撤销已知晓" : "标记为已知晓"}
        >
          {isDismissed ? <EyeOff size={14} /> : <X size={14} />}
        </button>

        {/* 跳转箭头 */}
        {alert.link && !isDismissed && (
          <ChevronRight size={14} className="mt-0.5" style={{ color: "var(--muted-foreground)" }} />
        )}
      </div>
    </div>
  );

  if (alert.link && !isDismissed) {
    return <Link href={alert.link}>{inner}</Link>;
  }
  return inner;
}

// ─── SectionHeader ────────────────────────────────────────────────────────────

function SectionHeader({
  category,
  count,
}: {
  category: AlertCategory;
  count: number;
}) {
  const cat = CATEGORY_CONFIG[category];
  return (
    <div className="flex items-center gap-2 mb-3">
      <span style={{ color: "var(--muted-foreground)" }}>{cat.icon}</span>
      <h2
        className="text-xs font-semibold uppercase tracking-wider"
        style={{ color: "var(--muted-foreground)" }}
      >
        {cat.label}
      </h2>
      <span
        className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
        style={{
          backgroundColor: "var(--surface-overlay)",
          color: "var(--muted-foreground)",
        }}
      >
        {count}
      </span>
    </div>
  );
}

// ─── AlertList（主导出）───────────────────────────────────────────────────────

export function AlertList({ alerts }: { alerts: Alert[] }) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [showDismissed, setShowDismissed] = useState(false);

  // 从 localStorage 恢复已关闭状态（仅客户端）
  useEffect(() => {
    setDismissed(loadDismissed());
  }, []);

  function toggleDismiss(id: string) {
    const next = new Set(dismissed);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setDismissed(next);
    saveDismissed(next);
  }

  const activeAlerts = alerts.filter((a) => !dismissed.has(a.id));
  const dismissedAlerts = alerts.filter((a) => dismissed.has(a.id));

  const activeBehavior = activeAlerts.filter((a) => a.category === "BEHAVIOR");
  const activePosition = activeAlerts.filter((a) => a.category === "POSITION");
  const highCount = activeAlerts.filter((a) => a.severity === "HIGH").length;

  return (
    <>
      {/* 统计摘要 */}
      <div className="grid grid-cols-3 gap-3">
        <div
          className="rounded-xl p-3 text-center"
          style={{
            backgroundColor: "var(--surface-card)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <p
            className="text-2xl font-bold"
            style={{
              color:
                activeAlerts.length > 0
                  ? "var(--brand-warning)"
                  : "var(--brand-green)",
            }}
          >
            {activeAlerts.length}
          </p>
          <p className="text-[11px] mt-0.5" style={{ color: "var(--muted-foreground)" }}>
            总预警
          </p>
        </div>
        <div
          className="rounded-xl p-3 text-center"
          style={{
            backgroundColor: "var(--surface-card)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <p
            className="text-2xl font-bold"
            style={{
              color: highCount > 0 ? "var(--brand-red)" : "var(--brand-green)",
            }}
          >
            {highCount}
          </p>
          <p className="text-[11px] mt-0.5" style={{ color: "var(--muted-foreground)" }}>
            高危
          </p>
        </div>
        <div
          className="rounded-xl p-3 text-center"
          style={{
            backgroundColor: "var(--surface-card)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <p className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>
            {activePosition.length}
          </p>
          <p className="text-[11px] mt-0.5" style={{ color: "var(--muted-foreground)" }}>
            持仓
          </p>
        </div>
      </div>

      {/* 无预警 */}
      {activeAlerts.length === 0 && (
        <div
          className="rounded-xl p-8 flex flex-col items-center gap-3 text-center"
          style={{
            backgroundColor: "var(--surface-card)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <CheckCircle size={32} style={{ color: "var(--brand-green)" }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
              目前没有任何预警 🎉
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>
              继续保持良好的交易纪律
            </p>
          </div>
        </div>
      )}

      {/* 行为预警 */}
      {activeBehavior.length > 0 && (
        <section>
          <SectionHeader category="BEHAVIOR" count={activeBehavior.length} />
          <div className="space-y-3">
            {activeBehavior.map((a) => (
              <AlertCard
                key={a.id}
                alert={a}
                onDismiss={() => toggleDismiss(a.id)}
              />
            ))}
          </div>
        </section>
      )}

      {/* 持仓预警 */}
      {activePosition.length > 0 && (
        <section>
          <SectionHeader category="POSITION" count={activePosition.length} />
          <div className="space-y-3">
            {activePosition.map((a) => (
              <AlertCard
                key={a.id}
                alert={a}
                onDismiss={() => toggleDismiss(a.id)}
              />
            ))}
          </div>
        </section>
      )}

      {/* 已知晓区块 */}
      {dismissedAlerts.length > 0 && (
        <section>
          <button
            onClick={() => setShowDismissed(!showDismissed)}
            className="flex items-center gap-1.5 text-xs py-1 transition-opacity hover:opacity-80"
            style={{ color: "var(--muted-foreground)" }}
          >
            {showDismissed ? <EyeOff size={12} /> : <Eye size={12} />}
            {showDismissed ? "隐藏" : "显示"}已知晓的预警（{dismissedAlerts.length}）
          </button>
          {showDismissed && (
            <div className="space-y-2 mt-2">
              {dismissedAlerts.map((a) => (
                <AlertCard
                  key={a.id}
                  alert={a}
                  onDismiss={() => toggleDismiss(a.id)}
                  isDismissed
                />
              ))}
            </div>
          )}
        </section>
      )}
    </>
  );
}
