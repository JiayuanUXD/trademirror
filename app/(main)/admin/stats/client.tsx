"use client";

import { AdminStats } from "@/lib/db/queries/admin";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import dayjs from "dayjs";

export function AdminStatsClient({ stats }: { stats: AdminStats }) {
  const chartData = stats.weeklyTrend.map((w) => ({
    label: dayjs(w.weekStart).format("MM/DD"),
    count: w.count,
  }));

  return (
    <div className="px-4 py-5 sm:px-6 sm:py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>
          全局统计
        </h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--muted-foreground)" }}>
          平台整体运营数据
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "注册用户", value: String(stats.totalUsers), sub: "人" },
          { label: "本周活跃", value: String(stats.activeUsersThisWeek), sub: "人" },
          { label: "本周决策", value: String(stats.decisionsThisWeek), sub: "笔" },
          {
            label: "高危占比",
            value: `${stats.highRiskPct}%`,
            sub: "含危险信号",
          },
        ].map((s) => (
          <div key={s.label} className="card-surface rounded-xl px-4 py-4 border">
            <div className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>
              {s.value}
            </div>
            <div className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>
              {s.label}
            </div>
            <div
              className="text-[11px] mt-0.5 opacity-50"
              style={{ color: "var(--muted-foreground)" }}
            >
              {s.sub}
            </div>
          </div>
        ))}
      </div>

      {/* Weekly trend chart */}
      <div className="card-surface rounded-xl border p-4">
        <h3 className="text-sm font-medium mb-4" style={{ color: "var(--foreground)" }}>
          近12周决策趋势
        </h3>
        {chartData.every((d) => d.count === 0) ? (
          <p className="text-sm text-center py-10" style={{ color: "var(--muted-foreground)" }}>
            暂无数据
          </p>
        ) : (
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis
                  dataKey="label"
                  tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                  axisLine={{ stroke: "var(--border-subtle)" }}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                  axisLine={{ stroke: "var(--border-subtle)" }}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--surface-card)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="count" fill="var(--brand-blue)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
