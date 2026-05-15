"use client";

import { useState, useEffect } from "react";
import dayjs from "dayjs";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Info } from "lucide-react";
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

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(dayjs());
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch all decisions for simplicity in MVP, though filtering by month would be better
    fetch("/api/decisions")
      .then((res) => res.json())
      .then((data) => {
        setDecisions(data);
        setLoading(false);
      });
  }, []);

  const daysInMonth = currentDate.daysInMonth();
  const firstDayOfMonth = currentDate.startOf("month").day();
  const days = [];

  // Previous month padding
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(null);
  }

  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(currentDate.date(i));
  }

  function getDecisionsForDay(date: dayjs.Dayjs) {
    return decisions.filter((d) => dayjs(d.createdAt).isSame(date, "day"));
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <CalendarIcon className="text-[var(--brand-blue)]" size={20} />
            回顾日历
          </h1>
          <p className="text-xs text-[var(--muted-foreground)] mt-1">
            按时间线复盘你的每一个决策，观察交易频率与情绪波动
          </p>
        </div>
        <div className="flex items-center gap-3 bg-[var(--surface-card)] px-3 py-1.5 rounded-lg border border-[var(--border-subtle)]">
          <button
            onClick={() => setCurrentDate(currentDate.subtract(1, "month"))}
            className="p-1 hover:bg-white/5 rounded transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-semibold min-w-[100px] text-center">
            {currentDate.format("YYYY年 MM月")}
          </span>
          <button
            onClick={() => setCurrentDate(currentDate.add(1, "month"))}
            className="p-1 hover:bg-white/5 rounded transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-[var(--surface-card)] rounded-2xl border border-[var(--border-subtle)] overflow-hidden">
        {/* Week headers */}
        <div className="grid grid-cols-7 border-b border-[var(--border-subtle)]">
          {["周日", "周一", "周二", "周三", "周四", "周五", "周六"].map((day) => (
            <div key={day} className="py-3 text-center text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider">
              {day}
            </div>
          ))}
        </div>

        {/* Days */}
        <div className="grid grid-cols-7">
          {days.map((date, i) => {
            if (!date) {
              return <div key={`empty-${i}`} className="aspect-square border-b border-r border-[var(--border-subtle)] bg-white/[0.01]" />;
            }

            const dayDecisions = getDecisionsForDay(date);
            const isToday = date.isSame(dayjs(), "day");
            const isWeekend = date.day() === 0 || date.day() === 6;

            return (
              <div
                key={date.toString()}
                className={`aspect-square p-2 border-b border-r border-[var(--border-subtle)] flex flex-col gap-1 transition-colors hover:bg-white/[0.02] ${
                  isToday ? "bg-[var(--brand-blue-dim)]/5" : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-medium ${
                    isToday ? "text-[var(--brand-blue)] font-bold" : isWeekend ? "text-[var(--muted-foreground)]" : ""
                  }`}>
                    {date.date()}
                  </span>
                  {dayDecisions.length > 0 && (
                    <span className="text-[10px] bg-[var(--surface-overlay)] px-1.5 py-0.5 rounded-full border border-[var(--border-subtle)]">
                      {dayDecisions.length}
                    </span>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto space-y-1 mt-1 scrollbar-none">
                  {dayDecisions.map((d) => (
                    <Link
                      key={d.id}
                      href={`/decisions?id=${d.id}`}
                      className="block text-[9px] px-1.5 py-1 rounded truncate transition-colors"
                      style={{
                        backgroundColor: d.fomoScore >= 7 ? "rgba(239, 68, 68, 0.1)" : "rgba(61, 142, 248, 0.1)",
                        color: d.fomoScore >= 7 ? "var(--brand-red)" : "var(--brand-blue)",
                        border: `1px solid ${d.fomoScore >= 7 ? "rgba(239, 68, 68, 0.2)" : "rgba(61, 142, 248, 0.2)"}`
                      }}
                    >
                      {d.stockName} · {d.action}
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 px-4 py-3 rounded-xl bg-[var(--surface-card)] border border-[var(--border-subtle)] text-[10px] text-[var(--muted-foreground)]">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-[var(--brand-blue)] opacity-20 border border-[var(--brand-blue)]/40" />
          <span>普通交易</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-[var(--brand-red)] opacity-20 border border-[var(--brand-red)]/40" />
          <span>高 FOMO 交易 (≥7)</span>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <Info size={12} />
          <span>点击交易项可跳转至决策卡详情</span>
        </div>
      </div>
    </div>
  );
}
