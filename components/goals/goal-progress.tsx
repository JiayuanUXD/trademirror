"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PlusCircle, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { type Goal, expectedAmountAt } from "@/lib/goals-utils";
import dayjs from "dayjs";

type Props = { goal: Goal };

export function GoalProgress({ goal }: Props) {
  const router = useRouter();
  const [showCheckin, setShowCheckin] = useState(false);
  const [checkinAmount, setCheckinAmount] = useState("");
  const [checkinNote, setCheckinNote] = useState("");
  const [saving, setSaving] = useState(false);

  const now = Date.now();
  const daysElapsed = (now - goal.createdAt) / (1000 * 60 * 60 * 24);
  const totalDays = goal.years * 365;
  const progressPct = Math.min((daysElapsed / totalDays) * 100, 100);

  const expected = expectedAmountAt(goal.startAmount, goal.requiredReturn, daysElapsed);
  const latestCheckin = goal.checkins[goal.checkins.length - 1];
  const currentAmount = latestCheckin?.amount ?? goal.startAmount;

  const deviation = expected > 0 ? ((currentAmount - expected) / expected) * 100 : 0;
  const toTarget = goal.targetAmount - currentAmount;
  const achievedPct = goal.startAmount > 0
    ? Math.min(((currentAmount - goal.startAmount) / (goal.targetAmount - goal.startAmount)) * 100, 100)
    : 0;

  async function handleCheckin() {
    const amt = parseFloat(checkinAmount);
    if (!amt || amt <= 0) return;
    setSaving(true);
    try {
      await fetch(`/api/goals/${goal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checkin: { amount: amt, note: checkinNote } }),
      });
      setShowCheckin(false);
      setCheckinAmount("");
      setCheckinNote("");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function handleAbandon() {
    await fetch(`/api/goals/${goal.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "ABANDONED" }),
    });
    router.refresh();
  }

  const deviationColor = deviation >= 5
    ? "var(--brand-green)"
    : deviation >= -5 ? "var(--brand-warning)" : "var(--brand-red)";
  const DeviationIcon = deviation >= 5 ? TrendingUp : deviation >= -5 ? Minus : TrendingDown;

  return (
    <div className="space-y-4">
      {/* Status banner */}
      {goal.status === "ACHIEVED" && (
        <div className="rounded-xl px-4 py-3 text-center"
          style={{ backgroundColor: "rgba(0,196,154,0.1)", border: "1px solid rgba(0,196,154,0.3)" }}>
          <p className="text-sm font-semibold" style={{ color: "var(--brand-green)" }}>🎉 目标已达成！</p>
        </div>
      )}
      {goal.status === "ABANDONED" && (
        <div className="rounded-xl px-4 py-3 text-center"
          style={{ backgroundColor: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
          <p className="text-sm" style={{ color: "var(--brand-red)" }}>此目标已放弃</p>
        </div>
      )}

      {/* Progress metrics */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border px-4 py-3"
          style={{ backgroundColor: "var(--surface-card)", borderColor: "var(--border-subtle)" }}>
          <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>当前账户</p>
          <p className="text-xl font-bold mt-0.5" style={{ color: "var(--foreground)" }}>
            ¥{currentAmount.toLocaleString()}
          </p>
          <p className="text-[11px] mt-0.5" style={{ color: "var(--muted-foreground)" }}>
            {latestCheckin ? `更新于 ${dayjs(latestCheckin.date).format("MM/DD")}` : "起始金额"}
          </p>
        </div>
        <div className="rounded-xl border px-4 py-3"
          style={{ backgroundColor: "var(--surface-card)", borderColor: "var(--border-subtle)" }}>
          <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>距目标还差</p>
          <p className="text-xl font-bold mt-0.5"
            style={{ color: toTarget <= 0 ? "var(--brand-green)" : "var(--foreground)" }}>
            {toTarget <= 0 ? "已达成" : `¥${toTarget.toLocaleString()}`}
          </p>
          <p className="text-[11px] mt-0.5" style={{ color: "var(--muted-foreground)" }}>
            目标 ¥{goal.targetAmount.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="rounded-xl border p-4 space-y-3"
        style={{ backgroundColor: "var(--surface-card)", borderColor: "var(--border-subtle)" }}>
        <div className="flex justify-between text-xs">
          <span style={{ color: "var(--muted-foreground)" }}>目标完成度</span>
          <span className="font-semibold" style={{ color: "var(--foreground)" }}>
            {Math.max(achievedPct, 0).toFixed(1)}%
          </span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: "var(--surface-overlay)" }}>
          <div className="h-full rounded-full transition-all"
            style={{ width: `${Math.max(achievedPct, 0)}%`, backgroundColor: "var(--brand-green)" }} />
        </div>

        <div className="flex justify-between text-xs">
          <span style={{ color: "var(--muted-foreground)" }}>时间进度</span>
          <span style={{ color: "var(--muted-foreground)" }}>{progressPct.toFixed(0)}%（剩余 {Math.max(Math.ceil(totalDays - daysElapsed), 0)} 天）</span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "var(--surface-overlay)" }}>
          <div className="h-full rounded-full"
            style={{ width: `${progressPct}%`, backgroundColor: "var(--brand-blue)" }} />
        </div>
      </div>

      {/* vs Expected */}
      <div className="rounded-xl border p-4 flex items-center gap-4"
        style={{ backgroundColor: "var(--surface-card)", borderColor: "var(--border-subtle)" }}>
        <DeviationIcon size={20} className="shrink-0" style={{ color: deviationColor }} />
        <div className="flex-1">
          <div className="flex justify-between text-xs mb-0.5">
            <span style={{ color: "var(--muted-foreground)" }}>当前 vs 预期路径</span>
            <span className="font-semibold" style={{ color: deviationColor }}>
              {deviation >= 0 ? "+" : ""}{deviation.toFixed(1)}%
            </span>
          </div>
          <p className="text-[11px]" style={{ color: "var(--muted-foreground)" }}>
            预期此时账户应为 ¥{Math.round(expected).toLocaleString()}，
            {deviation >= 5 ? "你已超前于计划 🎉" : deviation >= -5 ? "基本保持在轨道上" : "落后于计划，需要提速"}
          </p>
        </div>
      </div>

      {/* Checkin history */}
      {goal.checkins.length > 0 && (
        <div className="rounded-xl border p-4"
          style={{ backgroundColor: "var(--surface-card)", borderColor: "var(--border-subtle)" }}>
          <p className="text-xs font-medium mb-3" style={{ color: "var(--muted-foreground)" }}>
            更新记录（{goal.checkins.length} 次）
          </p>
          <div className="space-y-2">
            {[...goal.checkins].reverse().slice(0, 5).map((c, i) => {
              const prev = goal.checkins[goal.checkins.length - 1 - i - 1];
              const delta = prev ? c.amount - prev.amount : c.amount - goal.startAmount;
              return (
                <div key={i} className="flex items-center justify-between text-xs py-1 border-b last:border-0"
                  style={{ borderColor: "var(--border-subtle)" }}>
                  <span style={{ color: "var(--muted-foreground)" }}>{dayjs(c.date).format("YYYY/MM/DD")}</span>
                  <span className="font-medium" style={{ color: "var(--foreground)" }}>¥{c.amount.toLocaleString()}</span>
                  <span style={{ color: delta >= 0 ? "var(--brand-green)" : "var(--brand-red)" }}>
                    {delta >= 0 ? "+" : ""}¥{delta.toLocaleString()}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Actions */}
      {goal.status === "ACTIVE" && (
        <div className="space-y-2">
          {!showCheckin ? (
            <button type="button" onClick={() => setShowCheckin(true)}
              className="w-full py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-colors"
              style={{
                backgroundColor: "rgba(99,102,241,0.12)",
                color: "var(--brand-purple)",
                border: "1px solid rgba(99,102,241,0.25)",
              }}>
              <PlusCircle size={14} />
              更新当前账户金额
            </button>
          ) : (
            <div className="rounded-xl border p-4 space-y-3"
              style={{ backgroundColor: "var(--surface-card)", borderColor: "var(--border-subtle)" }}>
              <p className="text-xs font-medium" style={{ color: "var(--foreground)" }}>本次更新</p>
              <input type="number" value={checkinAmount}
                onChange={(e) => setCheckinAmount(e.target.value)}
                placeholder="当前账户总金额（元）" autoFocus
                className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                style={{ backgroundColor: "var(--surface-overlay)", color: "var(--foreground)", border: "1px solid var(--border-subtle)" }} />
              <input type="text" value={checkinNote}
                onChange={(e) => setCheckinNote(e.target.value)}
                placeholder="备注（可选，如：本月主要亏在茅台）" maxLength={50}
                className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                style={{ backgroundColor: "var(--surface-overlay)", color: "var(--foreground)", border: "1px solid var(--border-subtle)" }} />
              <div className="flex gap-2">
                <button type="button" onClick={handleCheckin} disabled={saving}
                  className="flex-1 py-2 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                  style={{ backgroundColor: "rgba(99,102,241,0.15)", color: "var(--brand-purple)", border: "1px solid rgba(99,102,241,0.3)" }}>
                  {saving ? "保存中…" : "确认"}
                </button>
                <button type="button" onClick={() => setShowCheckin(false)}
                  className="px-4 py-2 rounded-lg text-xs transition-colors"
                  style={{ backgroundColor: "var(--surface-overlay)", color: "var(--muted-foreground)", border: "1px solid var(--border-subtle)" }}>
                  取消
                </button>
              </div>
            </div>
          )}

          <button type="button" onClick={handleAbandon}
            className="w-full py-2 rounded-xl text-xs transition-colors"
            style={{ color: "var(--muted-foreground)", border: "1px solid var(--border-subtle)" }}>
            放弃此目标
          </button>
        </div>
      )}
    </div>
  );
}
