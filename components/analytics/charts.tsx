"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, LineChart, Line, ResponsiveContainer, Legend,
  ScatterChart, Scatter, ReferenceLine,
} from "recharts";
import type {
  BasisBreakdownItem,
  FomoDistItem,
  DangerBreakdownItem,
  ActionBreakdownItem,
  WeeklyTrendItem,
  DisciplineTrendItem,
  FomoVsReturnItem,
} from "@/lib/analytics";

const TOOLTIP_STYLE = {
  backgroundColor: "var(--surface-overlay)",
  border: "1px solid var(--border-subtle)",
  borderRadius: 8,
  color: "var(--foreground)",
  fontSize: 12,
};

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-center h-full text-xs" style={{ color: "var(--muted-foreground)" }}>
      {text}
    </div>
  );
}

// 决策依据分布 bar chart
export function BasisChart({ data }: { data: BasisBreakdownItem[] }) {
  if (data.length === 0) return <EmptyState text="暂无数据" />;
  const chartData = data.map((d) => ({
    name: d.name,
    count: d.count,
    fill: d.type === "rational" ? "var(--brand-green)" : "var(--brand-red)",
  }));
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="name" width={88} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
        <Bar dataKey="count" name="次数" radius={[0, 4, 4, 0]}>
          {chartData.map((entry, i) => (
            <Cell key={i} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// FOMO 分布直方图
export function FomoChart({ data }: { data: FomoDistItem[] }) {
  const hasData = data.some((d) => d.count > 0);
  if (!hasData) return <EmptyState text="暂无数据" />;

  const chartData = data.map((d) => ({
    score: String(d.score),
    count: d.count,
    fill: d.score >= 7 ? "var(--brand-red)" : d.score >= 4 ? "var(--brand-warning)" : "var(--brand-green)",
  }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chartData} margin={{ left: 0, right: 8, top: 4, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
        <XAxis dataKey="score" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
        <Bar dataKey="count" name="次数" radius={[4, 4, 0, 0]}>
          {chartData.map((entry, i) => (
            <Cell key={i} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// 高危信号柱状图
export function DangerChart({ data }: { data: DangerBreakdownItem[] }) {
  const hasData = data.some((d) => d.count > 0);
  if (!hasData) return <EmptyState text="暂无高危交易" />;

  const chartData = data.filter((d) => d.count > 0).map((d) => ({
    name: d.signal,
    count: d.count,
  }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} allowDecimals={false} />
        <YAxis type="category" dataKey="name" width={96} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
        <Bar dataKey="count" name="次数" fill="var(--brand-warning)" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// 操作方向饼图
const ACTION_COLORS: Record<string, string> = {
  买入: "var(--brand-red)",
  加仓: "#f87171",
  卖出: "var(--brand-green)",
  减仓: "#86efac",
  清仓: "#4ade80",
};

export function ActionPie({ data }: { data: ActionBreakdownItem[] }) {
  if (data.length === 0) return <EmptyState text="暂无数据" />;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          dataKey="count"
          nameKey="action"
          cx="50%"
          cy="50%"
          innerRadius="45%"
          outerRadius="70%"
          paddingAngle={3}
          label={(props) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const p = props as any;
            const pct = (p.percent as number | undefined) ?? 0;
            return pct > 0.05 ? `${(p.action as string) ?? ""} ${Math.round(pct * 100)}%` : "";
          }}
          labelLine={false}
        >
          {data.map((entry, i) => (
            <Cell key={i} fill={ACTION_COLORS[entry.action] ?? "var(--brand-blue)"} />
          ))}
        </Pie>
        <Tooltip contentStyle={TOOLTIP_STYLE} />
        <Legend iconType="circle" iconSize={8} formatter={(v) => <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{v}</span>} />
      </PieChart>
    </ResponsiveContainer>
  );
}

// 每周操作趋势
export function WeeklyTrendChart({ data }: { data: WeeklyTrendItem[] }) {
  if (data.length === 0) return <EmptyState text="暂无数据" />;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ left: 0, right: 16, top: 4, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
        <XAxis dataKey="week" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip contentStyle={TOOLTIP_STYLE} />
        <Line type="monotone" dataKey="count" name="总操作" stroke="var(--brand-blue)" strokeWidth={2} dot={{ r: 3, fill: "var(--brand-blue)" }} />
        <Line type="monotone" dataKey="dangerCount" name="高危" stroke="var(--brand-warning)" strokeWidth={2} dot={{ r: 3, fill: "var(--brand-warning)" }} strokeDasharray="4 2" />
        <Legend iconType="circle" iconSize={8} formatter={(v) => <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{v}</span>} />
      </LineChart>
    </ResponsiveContainer>
  );
}

// FOMO 评分 vs 30日盈亏 散点图
type ScatterTooltipProps = {
  active?: boolean;
  payload?: Array<{ payload: FomoVsReturnItem }>;
};

function ScatterTooltipContent({ active, payload }: ScatterTooltipProps) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const sign = d.return30Days >= 0 ? "+" : "";
  return (
    <div
      className="rounded-lg px-3 py-2 text-xs"
      style={{ ...TOOLTIP_STYLE, minWidth: 120 }}
    >
      <p className="font-medium mb-1" style={{ color: "var(--foreground)" }}>
        {d.action} {d.stockName}
      </p>
      <p style={{ color: "var(--muted-foreground)" }}>FOMO：{d.fomoScore}</p>
      <p style={{ color: d.return30Days >= 0 ? "var(--brand-green)" : "var(--brand-red)" }}>
        30日盈亏：{sign}{d.return30Days}%
      </p>
    </div>
  );
}

export function FomoScatterChart({ data }: { data: FomoVsReturnItem[] }) {
  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 text-center px-4">
        <p className="text-xs font-medium" style={{ color: "var(--foreground)" }}>
          暂无数据
        </p>
        <p className="text-[11px]" style={{ color: "var(--muted-foreground)" }}>
          在决策详情页填写"30日后价格"后，这里将显示 FOMO 分数与实际盈亏的相关性
        </p>
      </div>
    );
  }

  // 每个点按 FOMO≥7 vs 非危险着色
  const pointsWithColor = data.map((d) => ({
    ...d,
    fill: d.fomoScore >= 7 ? "var(--brand-red)" : "var(--brand-blue)",
  }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ScatterChart margin={{ left: 8, right: 16, top: 8, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
        <XAxis
          type="number"
          dataKey="fomoScore"
          domain={[1, 10]}
          ticks={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]}
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          axisLine={false}
          tickLine={false}
          label={{ value: "FOMO 评分", position: "insideBottom", offset: -2, fontSize: 11, fill: "var(--muted-foreground)" }}
        />
        <YAxis
          type="number"
          dataKey="return30Days"
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) => `${v > 0 ? "+" : ""}${v}%`}
        />
        {/* 零轴 */}
        <ReferenceLine y={0} stroke="var(--border-strong)" strokeDasharray="4 2" />
        {/* FOMO≥7 警戒线 */}
        <ReferenceLine
          x={7}
          stroke="rgba(239,68,68,0.4)"
          strokeDasharray="4 2"
          label={{ value: "高危区", position: "top", fontSize: 10, fill: "var(--brand-red)" }}
        />
        <Tooltip content={<ScatterTooltipContent />} cursor={{ strokeDasharray: "3 3" }} />
        <Scatter
          data={pointsWithColor}
          shape={(props: { cx?: number; cy?: number; payload?: FomoVsReturnItem & { fill: string } }) => {
            const cx = props.cx ?? 0;
            const cy = props.cy ?? 0;
            const fill = props.payload?.fill ?? "var(--brand-blue)";
            return (
              <circle
                cx={cx}
                cy={cy}
                r={5}
                fill={fill}
                fillOpacity={0.75}
                stroke={fill}
                strokeWidth={1}
              />
            );
          }}
        />
      </ScatterChart>
    </ResponsiveContainer>
  );
}

// 纪律分趋势
export function DisciplineChart({ data }: { data: DisciplineTrendItem[] }) {
  if (data.length === 0) return <EmptyState text="尚无复盘数据" />;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ left: 0, right: 16, top: 4, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
        <XAxis dataKey="week" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
        <YAxis domain={[0, 14]} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`${v}/14`, "纪律分"]} />
        <Line
          type="monotone"
          dataKey="total"
          name="纪律分"
          stroke="var(--brand-purple)"
          strokeWidth={2}
          dot={{ r: 4, fill: "var(--brand-purple)" }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
