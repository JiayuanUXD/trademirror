"use client";

import { useState, useEffect } from "react";
import dayjs from "dayjs";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import Link from "next/link";

type Decision = {
  id: string;
  stockName: string;
  stockCode: string;
  action: "BUY" | "ADD" | "SELL" | "REDUCE" | "CLEAR";
  price: number;
  createdAt: number;
  fomoScore: number;
  dangerSignals: string;
};

const ACTION_LABELS: Record<Decision["action"], string> = {
  BUY:    "买入",
  ADD:    "加仓",
  SELL:   "卖出",
  REDUCE: "减仓",
  CLEAR:  "清仓",
};

const BUY_ACTIONS = new Set<Decision["action"]>(["BUY", "ADD"]);

function actionColor(action: Decision["action"]) {
  if (action === "BUY")    return "var(--color-up)";
  if (action === "ADD")    return "var(--color-up)";
  if (action === "CLEAR")  return "var(--color-down)";
  return "var(--color-down)";
}

function actionBg(action: Decision["action"]) {
  if (action === "BUY")    return "rgba(239,68,68, 0.14)";
  if (action === "ADD")    return "rgba(239,68,68, 0.06)";   // 浅
  if (action === "CLEAR")  return "rgba(34,197,94, 0.14)";
  if (action === "SELL")   return "rgba(34,197,94, 0.14)";
  return "rgba(34,197,94, 0.06)";                            // REDUCE 浅
}

function actionBorder(action: Decision["action"]) {
  if (action === "BUY")    return "rgba(239,68,68, 0.35)";
  if (action === "ADD")    return "rgba(239,68,68, 0.18)";   // 浅
  if (action === "CLEAR")  return "rgba(34,197,94, 0.35)";
  if (action === "SELL")   return "rgba(34,197,94, 0.35)";
  return "rgba(34,197,94, 0.18)";                            // REDUCE 浅
}

function isDangerous(d: Decision) {
  if (d.fomoScore >= 7) return true;
  try {
    const signals = JSON.parse(d.dangerSignals);
    return Array.isArray(signals) && signals.length > 0;
  } catch {
    return false;
  }
}

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(dayjs());
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/decisions?status=ALL&limit=500")
      .then((res) => res.json())
      .then((data: unknown) => {
        if (Array.isArray(data)) setDecisions(data as Decision[]);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const daysInMonth = currentDate.daysInMonth();
  const firstDayOfMonth = currentDate.startOf("month").day();
  const days: (dayjs.Dayjs | null)[] = [];

  for (let i = 0; i < firstDayOfMonth; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(currentDate.date(i));

  function getDecisionsForDay(date: dayjs.Dayjs) {
    return decisions.filter((d) => dayjs(d.createdAt).isSame(date, "day"));
  }

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <CalendarIcon style={{ color: "var(--brand-blue)" }} size={20} />
            回顾日历
          </h1>
          <p className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>
            按时间线复盘每一个决策，观察交易频率与情绪波动
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border"
          style={{ backgroundColor: "var(--surface-card)", borderColor: "var(--border-subtle)" }}>
          <button onClick={() => setCurrentDate((d) => d.subtract(1, "month"))}
            className="p-1 rounded transition-colors hover:opacity-70">
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-semibold min-w-[90px] text-center">
            {currentDate.format("YYYY年 MM月")}
          </span>
          <button onClick={() => setCurrentDate((d) => d.add(1, "month"))}
            className="p-1 rounded transition-colors hover:opacity-70">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Calendar */}
      <div className="rounded-2xl border overflow-hidden"
        style={{ backgroundColor: "var(--surface-card)", borderColor: "var(--border-subtle)" }}>

        {/* Week headers */}
        <div className="grid grid-cols-7 border-b" style={{ borderColor: "var(--border-subtle)" }}>
          {["周日", "周一", "周二", "周三", "周四", "周五", "周六"].map((day) => (
            <div key={day} className="py-3 text-center text-[10px] font-bold uppercase tracking-wider"
              style={{ color: "var(--muted-foreground)" }}>
              {day}
            </div>
          ))}
        </div>

        {/* Day cells */}
        {loading ? (
          <div className="py-20 text-center text-sm" style={{ color: "var(--muted-foreground)" }}>加载中…</div>
        ) : (
          <div className="grid grid-cols-7">
            {days.map((date, i) => {
              if (!date) {
                return (
                  <div key={`empty-${i}`}
                    className="aspect-square border-b border-r"
                    style={{ borderColor: "var(--border-subtle)", backgroundColor: "rgba(255,255,255,0.01)" }} />
                );
              }

              const dayDecisions = getDecisionsForDay(date);
              const isToday = date.isSame(dayjs(), "day");
              const isWeekend = date.day() === 0 || date.day() === 6;

              // Summary counts for the day
              const buyCount    = dayDecisions.filter((d) => d.action === "BUY").length;
              const addCount    = dayDecisions.filter((d) => d.action === "ADD").length;
              const sellCount   = dayDecisions.filter((d) => !BUY_ACTIONS.has(d.action)).length;

              return (
                <div key={date.toString()}
                  className="aspect-square p-1.5 border-b border-r flex flex-col gap-0.5 transition-colors hover:bg-white/[0.02]"
                  style={{
                    borderColor: "var(--border-subtle)",
                    backgroundColor: isToday ? "rgba(61,142,248,0.06)" : undefined,
                  }}>

                  {/* Date number + day summary dots */}
                  <div className="flex items-center justify-between px-0.5">
                    <span className={`text-xs font-medium`}
                      style={{
                        color: isToday ? "var(--brand-blue)" : isWeekend ? "var(--muted-foreground)" : "var(--foreground)",
                        fontWeight: isToday ? 700 : undefined,
                      }}>
                      {date.date()}
                    </span>

                    {/* Mini count chips */}
                    {dayDecisions.length > 0 && (
                      <div className="flex items-center gap-0.5">
                        {buyCount > 0 && (
                          <span className="text-[9px] leading-none px-1 py-0.5 rounded font-bold tabular-nums"
                            style={{ backgroundColor: "rgba(239,68,68,0.18)", color: "var(--color-up)" }}>
                            买{buyCount}
                          </span>
                        )}
                        {addCount > 0 && (
                          <span className="text-[9px] leading-none px-1 py-0.5 rounded font-bold tabular-nums"
                            style={{ backgroundColor: "rgba(239,68,68,0.08)", color: "var(--color-up)", opacity: 0.8 }}>
                            加{addCount}
                          </span>
                        )}
                        {sellCount > 0 && (
                          <span className="text-[9px] leading-none px-1 py-0.5 rounded font-bold tabular-nums"
                            style={{ backgroundColor: "rgba(34,197,94,0.15)", color: "var(--color-down)" }}>
                            卖{sellCount}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Decision entries */}
                  <div className="flex-1 overflow-y-auto space-y-0.5 scrollbar-none">
                    {dayDecisions.map((d) => {
                      const dangerous = isDangerous(d);
                      return (
                        <Link
                          key={d.id}
                          href={`/decisions/${d.id}`}
                          className="relative block text-[9px] px-1.5 py-0.5 rounded truncate transition-opacity hover:opacity-80"
                          style={{
                            backgroundColor: actionBg(d.action),
                            color: actionColor(d.action),
                            border: `1px solid ${actionBorder(d.action)}`,
                          }}
                        >
                          <span className="font-bold mr-0.5">{ACTION_LABELS[d.action]}</span>
                          {d.stockName}
                          {dangerous && (
                            <span
                              className="absolute top-0 right-0 translate-x-1/3 -translate-y-1/3 w-2 h-2 rounded-full"
                              style={{ backgroundColor: "var(--brand-warning)", border: "1px solid var(--surface-card)" }}
                            />
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center flex-wrap gap-x-5 gap-y-2 px-4 py-3 rounded-xl border text-[11px]"
        style={{ backgroundColor: "var(--surface-card)", borderColor: "var(--border-subtle)", color: "var(--muted-foreground)" }}>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: "rgba(239,68,68,0.14)", border: "1px solid rgba(239,68,68,0.35)" }} />
          <span>买入</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.18)" }} />
          <span>加仓</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: "rgba(34,197,94,0.14)", border: "1px solid rgba(34,197,94,0.35)" }} />
          <span>卖出 / 清仓</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.18)" }} />
          <span>减仓</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "var(--brand-warning)" }} />
          <span>高 FOMO 或危险信号</span>
        </div>
        <div className="flex items-center gap-1.5 ml-auto">
          <span className="text-[10px] px-1.5 py-0.5 rounded font-bold"
            style={{ backgroundColor: "rgba(239,68,68,0.15)", color: "var(--color-up)" }}>
            +2
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded font-bold"
            style={{ backgroundColor: "rgba(34,197,94,0.15)", color: "var(--color-down)" }}>
            -1
          </span>
          <span>当日买入/卖出笔数</span>
        </div>
      </div>
    </div>
  );
}
