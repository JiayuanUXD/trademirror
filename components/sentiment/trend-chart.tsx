"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  LabelList,
} from "recharts";
import dayjs from "dayjs";
import type { SentimentTrendRow } from "@/lib/db/queries/sentiment";

type Props = { trend: SentimentTrendRow[] };

type Row = {
  date: string;
  涨停: number;
  跌停: number;
  封板率: number;
  最高连板: number;
};

export function TrendChart({ trend }: Props) {
  if (trend.length === 0) {
    return (
      <div
        className="card-surface rounded-xl border p-8 text-center"
        style={{ borderColor: "var(--border-subtle)" }}
      >
        <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
          还没有历史数据，连续回填几天后这里会显示趋势线。
        </p>
      </div>
    );
  }

  const data: Row[] = trend.map((r) => ({
    date: dayjs(r.tradeDate).format("MM-DD"),
    涨停: r.limitUpCount ?? 0,
    跌停: r.limitDownCount ?? 0,
    封板率: r.sealRate != null ? Math.round(r.sealRate * 100) : 0,
    最高连板: r.maxConsecBoards ?? 0,
  }));

  const lastIndex = data.length - 1;
  const tickInterval = data.length <= 14 ? 0 : data.length <= 30 ? 1 : 4;
  const showAllDots = data.length <= 30;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <ChartCard
        title="涨停家数"
        hint="情绪温度计"
        legend={[
          { color: "var(--brand-warning)", label: "30 冰点线" },
          { color: "var(--color-up)", label: "80 主升线" },
        ]}
      >
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={data} margin={{ top: 18, right: 24, left: -8, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} interval={tickInterval} stroke="var(--muted-foreground)" />
            <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
            <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: "var(--border-subtle)" }} />
            <ReferenceLine
              y={30}
              stroke="var(--brand-warning)"
              strokeDasharray="4 4"
              opacity={0.5}
            />
            <ReferenceLine
              y={80}
              stroke="var(--color-up)"
              strokeDasharray="4 4"
              opacity={0.5}
            />
            <Line
              type="monotone"
              dataKey="涨停"
              stroke="var(--color-up)"
              strokeWidth={2.2}
              dot={(props: DotProps) => renderDot(props, lastIndex, "var(--color-up)", showAllDots)}
              activeDot={{ r: 5 }}
            >
              <LabelList
                dataKey="涨停"
                position="top"
                content={(props) => renderLastLabel(props, lastIndex, "var(--color-up)")}
              />
            </Line>
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        title="封板率"
        hint="资金接力意愿（越高越强势）"
        legend={[{ color: "var(--brand-warning)", label: "70% 主升线" }]}
      >
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={data} margin={{ top: 18, right: 24, left: -8, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} interval={tickInterval} stroke="var(--muted-foreground)" />
            <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} stroke="var(--muted-foreground)" />
            <Tooltip contentStyle={tooltipStyle} formatter={(v) => `${v}%`} cursor={{ stroke: "var(--border-subtle)" }} />
            <ReferenceLine y={70} stroke="var(--brand-warning)" strokeDasharray="4 4" opacity={0.5} />
            <Line
              type="monotone"
              dataKey="封板率"
              stroke="var(--brand-warning)"
              strokeWidth={2.2}
              dot={(props: DotProps) => renderDot(props, lastIndex, "var(--brand-warning)", showAllDots)}
              activeDot={{ r: 5 }}
            >
              <LabelList
                dataKey="封板率"
                position="top"
                content={(props) => renderLastLabel(props, lastIndex, "var(--brand-warning)", "%")}
              />
            </Line>
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        title="最高连板"
        hint="高度与梯队"
        legend={[
          { color: "var(--muted-foreground)", label: "2 冰点上限" },
          { color: "var(--brand-purple)", label: "5 主升下限" },
        ]}
      >
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={data} margin={{ top: 18, right: 24, left: -8, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} interval={tickInterval} stroke="var(--muted-foreground)" />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} stroke="var(--muted-foreground)" />
            <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: "var(--border-subtle)" }} />
            <ReferenceLine y={2} stroke="var(--muted-foreground)" strokeDasharray="4 4" opacity={0.4} />
            <ReferenceLine y={5} stroke="var(--brand-purple)" strokeDasharray="4 4" opacity={0.5} />
            <Line
              type="monotone"
              dataKey="最高连板"
              stroke="var(--brand-purple)"
              strokeWidth={2.2}
              dot={(props: DotProps) => renderDot(props, lastIndex, "var(--brand-purple)", showAllDots)}
              activeDot={{ r: 5 }}
            >
              <LabelList
                dataKey="最高连板"
                position="top"
                content={(props) => renderLastLabel(props, lastIndex, "var(--brand-purple)")}
              />
            </Line>
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        title="跌停家数"
        hint="走高 = 系统性风险"
      >
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={data} margin={{ top: 18, right: 24, left: -8, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} interval={tickInterval} stroke="var(--muted-foreground)" />
            <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
            <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: "var(--border-subtle)" }} />
            <ReferenceLine y={30} stroke="var(--color-down)" strokeDasharray="4 4" opacity={0.5} />
            <Line
              type="monotone"
              dataKey="跌停"
              stroke="var(--color-down)"
              strokeWidth={2.2}
              dot={(props: DotProps) => renderDot(props, lastIndex, "var(--color-down)", showAllDots)}
              activeDot={{ r: 5 }}
            >
              <LabelList
                dataKey="跌停"
                position="top"
                content={(props) => renderLastLabel(props, lastIndex, "var(--color-down)")}
              />
            </Line>
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}

const tooltipStyle = {
  backgroundColor: "var(--surface-overlay)",
  border: "1px solid var(--border-subtle)",
  borderRadius: 8,
  fontSize: 12,
};

type DotProps = {
  cx?: number;
  cy?: number;
  index?: number;
};

function renderDot(props: DotProps, lastIdx: number, color: string, showAll: boolean) {
  const { cx, cy, index } = props;
  if (cx == null || cy == null) return <g />;
  const isLast = index === lastIdx;
  if (!isLast && !showAll) return <g />;
  return (
    <circle
      cx={cx}
      cy={cy}
      r={isLast ? 4.5 : 2.2}
      fill={isLast ? color : "var(--surface-card)"}
      stroke={color}
      strokeWidth={isLast ? 2 : 1.4}
    />
  );
}

type LabelProps = {
  x?: number | string;
  y?: number | string;
  value?: string | number | null | Array<string | number>;
  index?: number;
};

function renderLastLabel(
  props: unknown,
  lastIdx: number,
  color: string,
  suffix = ""
) {
  const { x, y, value, index } = props as LabelProps;
  if (index !== lastIdx || x == null || y == null || value == null) return <g />;
  const text = Array.isArray(value) ? value.join(",") : value;
  const xn = typeof x === "string" ? Number(x) : x;
  const yn = typeof y === "string" ? Number(y) : y;
  return (
    <text
      x={xn}
      y={yn - 8}
      fill={color}
      fontSize={11}
      fontWeight={600}
      textAnchor="middle"
    >
      {text}
      {suffix}
    </text>
  );
}

function ChartCard({
  title,
  hint,
  legend,
  children,
}: {
  title: string;
  hint?: string;
  legend?: { color: string; label: string }[];
  children: React.ReactNode;
}) {
  return (
    <div
      className="card-surface rounded-xl border p-4"
      style={{ borderColor: "var(--border-subtle)" }}
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <h3 className="text-xs font-semibold" style={{ color: "var(--foreground)" }}>
            {title}
          </h3>
          {hint && (
            <p className="text-[10px] mt-0.5" style={{ color: "var(--muted-foreground)" }}>
              {hint}
            </p>
          )}
        </div>
        {legend && legend.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 justify-end">
            {legend.map((l) => (
              <span
                key={l.label}
                className="inline-flex items-center gap-1 text-[10px]"
                style={{ color: "var(--muted-foreground)" }}
              >
                <span
                  className="inline-block w-3 border-t border-dashed"
                  style={{ borderColor: l.color }}
                />
                {l.label}
              </span>
            ))}
          </div>
        )}
      </div>
      {children}
    </div>
  );
}
