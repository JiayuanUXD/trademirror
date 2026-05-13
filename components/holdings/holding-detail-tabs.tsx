"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2, CheckSquare, Square } from "lucide-react";
import type { Holding, LogicReason, Prerequisite, ExitCondition, ExitConditionType } from "@/types/holding";
import { EXIT_CONDITION_LABELS } from "@/types/holding";
import type { Decision } from "@/types/decision";
import { ACTION_LABELS } from "@/types/decision";
import dayjs from "dayjs";

type Props = { holding: Holding; decisions: Decision[] };

const TABS = ["持有逻辑", "持有前提", "撤退条件", "操作记录"] as const;
type Tab = (typeof TABS)[number];

export function HoldingDetailTabs({ holding: initial, decisions }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("持有逻辑");
  const [holding, setHolding] = useState(initial);
  const [isPending, startTransition] = useTransition();

  async function patch(body: Record<string, unknown>) {
    const res = await fetch(`/api/holdings/${holding.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const updated = await res.json() as Holding;
      startTransition(() => setHolding(updated));
    }
  }

  // ── Logic Tab ──
  const [newReason, setNewReason] = useState("");

  async function addReason() {
    if (!newReason.trim()) return;
    const reasons: LogicReason[] = [
      ...holding.logic.reasons,
      { id: crypto.randomUUID(), content: newReason.trim(), hasData: false, isVerifiable: false },
    ];
    await patch({ reasons, moat: holding.logic.moat, keyFinancials: holding.logic.keyFinancials });
    setNewReason("");
  }

  async function removeReason(id: string) {
    const reasons = holding.logic.reasons.filter((r) => r.id !== id);
    await patch({ reasons, moat: holding.logic.moat, keyFinancials: holding.logic.keyFinancials });
  }

  async function toggleReasonFlag(id: string, flag: "hasData" | "isVerifiable") {
    const reasons = holding.logic.reasons.map((r) =>
      r.id === id ? { ...r, [flag]: !r[flag] } : r
    );
    await patch({ reasons, moat: holding.logic.moat, keyFinancials: holding.logic.keyFinancials });
  }

  // ── Prerequisites Tab ──
  const [newPrereq, setNewPrereq] = useState("");

  async function addPrereq() {
    if (!newPrereq.trim()) return;
    const prerequisites: Prerequisite[] = [
      ...holding.prerequisites,
      { id: crypto.randomUUID(), content: newPrereq.trim(), checked: false },
    ];
    await patch({ prerequisites });
    setNewPrereq("");
  }

  async function togglePrereq(id: string) {
    const prerequisites = holding.prerequisites.map((p) =>
      p.id === id ? { ...p, checked: !p.checked } : p
    );
    await patch({ prerequisites });
  }

  async function removePrereq(id: string) {
    const prerequisites = holding.prerequisites.filter((p) => p.id !== id);
    await patch({ prerequisites });
  }

  // ── Exit Conditions Tab ──
  const [newExit, setNewExit] = useState({ type: "PRICE_BELOW" as ExitConditionType, description: "", threshold: "" });

  async function addExitCondition() {
    if (!newExit.description.trim()) return;
    const exitConditions: ExitCondition[] = [
      ...holding.exitConditions,
      {
        id: crypto.randomUUID(),
        type: newExit.type,
        description: newExit.description.trim(),
        threshold: newExit.threshold ? Number(newExit.threshold) : undefined,
        triggered: false,
      },
    ];
    await patch({ exitConditions });
    setNewExit({ type: "PRICE_BELOW", description: "", threshold: "" });
  }

  async function triggerExitCondition(id: string) {
    const exitConditions = holding.exitConditions.map((c) =>
      c.id === id ? { ...c, triggered: !c.triggered } : c
    );
    await patch({ exitConditions });
  }

  async function removeExit(id: string) {
    const exitConditions = holding.exitConditions.filter((c) => c.id !== id);
    await patch({ exitConditions });
  }

  const cardStyle = {
    backgroundColor: "var(--surface-overlay)",
    borderColor: "var(--border-subtle)",
  };

  const inputStyle = {
    backgroundColor: "var(--surface-card)",
    borderColor: "var(--border-subtle)",
    color: "var(--foreground)",
  };

  return (
    <div className={isPending ? "opacity-70 pointer-events-none" : ""}>
      {/* Tab bar */}
      <div className="flex gap-1 mb-4 border-b" style={{ borderColor: "var(--border-subtle)" }}>
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className="px-3 py-2 text-sm transition-colors relative"
            style={{
              color: activeTab === tab ? "var(--foreground)" : "var(--muted-foreground)",
            }}
          >
            {tab}
            {activeTab === tab && (
              <span
                className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t"
                style={{ backgroundColor: "var(--brand-blue)" }}
              />
            )}
          </button>
        ))}
      </div>

      {/* ── 持有逻辑 ── */}
      {activeTab === "持有逻辑" && (
        <div className="space-y-3">
          {holding.logic.reasons.length === 0 && (
            <p className="text-sm text-center py-6" style={{ color: "var(--muted-foreground)" }}>
              还没有持有理由，至少添加 3 条来提升健康分
            </p>
          )}

          {holding.logic.reasons.map((r) => (
            <div key={r.id} className="rounded-lg border p-3" style={cardStyle}>
              <div className="flex items-start gap-2">
                <p className="flex-1 text-sm" style={{ color: "var(--foreground)" }}>{r.content}</p>
                <button type="button" onClick={() => removeReason(r.id)}>
                  <Trash2 size={13} style={{ color: "var(--muted-foreground)" }} />
                </button>
              </div>
              <div className="flex gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => toggleReasonFlag(r.id, "hasData")}
                  className="flex items-center gap-1 text-[11px] transition-colors"
                  style={{ color: r.hasData ? "var(--brand-green)" : "var(--muted-foreground)" }}
                >
                  {r.hasData ? <CheckSquare size={12} /> : <Square size={12} />}
                  有数据支撑
                </button>
                <button
                  type="button"
                  onClick={() => toggleReasonFlag(r.id, "isVerifiable")}
                  className="flex items-center gap-1 text-[11px] transition-colors"
                  style={{ color: r.isVerifiable ? "var(--brand-blue)" : "var(--muted-foreground)" }}
                >
                  {r.isVerifiable ? <CheckSquare size={12} /> : <Square size={12} />}
                  可验证
                </button>
              </div>
            </div>
          ))}

          <div className="flex gap-2">
            <input
              className="flex-1 h-9 px-3 rounded-md text-sm border"
              style={inputStyle}
              placeholder="添加持有理由…"
              value={newReason}
              onChange={(e) => setNewReason(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addReason()}
            />
            <button
              type="button"
              onClick={addReason}
              className="h-9 px-3 rounded-md text-sm text-white"
              style={{ backgroundColor: "var(--brand-blue)" }}
            >
              <Plus size={14} />
            </button>
          </div>
        </div>
      )}

      {/* ── 持有前提 ── */}
      {activeTab === "持有前提" && (
        <div className="space-y-3">
          <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
            勾选表示该前提已失效，不满足时请重新审视持仓逻辑。
          </p>

          {holding.prerequisites.length === 0 && (
            <p className="text-sm text-center py-6" style={{ color: "var(--muted-foreground)" }}>
              还没有持有前提
            </p>
          )}

          {holding.prerequisites.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-2 rounded-lg border p-3"
              style={{ ...cardStyle, opacity: p.checked ? 0.5 : 1 }}
            >
              <button type="button" onClick={() => togglePrereq(p.id)}>
                {p.checked
                  ? <CheckSquare size={16} style={{ color: "var(--brand-red)" }} />
                  : <Square size={16} style={{ color: "var(--muted-foreground)" }} />}
              </button>
              <span
                className="flex-1 text-sm"
                style={{
                  color: "var(--foreground)",
                  textDecoration: p.checked ? "line-through" : "none",
                }}
              >
                {p.content}
              </span>
              <button type="button" onClick={() => removePrereq(p.id)}>
                <Trash2 size={13} style={{ color: "var(--muted-foreground)" }} />
              </button>
            </div>
          ))}

          <div className="flex gap-2">
            <input
              className="flex-1 h-9 px-3 rounded-md text-sm border"
              style={inputStyle}
              placeholder="半年报业绩增速 >20%…"
              value={newPrereq}
              onChange={(e) => setNewPrereq(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addPrereq()}
            />
            <button
              type="button"
              onClick={addPrereq}
              className="h-9 px-3 rounded-md text-sm text-white"
              style={{ backgroundColor: "var(--brand-blue)" }}
            >
              <Plus size={14} />
            </button>
          </div>
        </div>
      )}

      {/* ── 撤退条件 ── */}
      {activeTab === "撤退条件" && (
        <div className="space-y-3">
          {holding.exitConditions.length === 0 && (
            <p className="text-sm text-center py-6" style={{ color: "var(--muted-foreground)" }}>
              还没有撤退条件
            </p>
          )}

          {holding.exitConditions.map((c) => (
            <div
              key={c.id}
              className="flex items-start gap-2 rounded-lg border p-3"
              style={{ ...cardStyle, borderColor: c.triggered ? "var(--brand-red)" : "var(--border-subtle)" }}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded"
                    style={{ backgroundColor: "var(--surface-card)", color: "var(--muted-foreground)" }}
                  >
                    {EXIT_CONDITION_LABELS[c.type]}
                  </span>
                  {c.triggered && (
                    <span className="text-[10px]" style={{ color: "var(--brand-red)" }}>⚠ 已触发</span>
                  )}
                </div>
                <p className="text-sm mt-1" style={{ color: "var(--foreground)" }}>{c.description}</p>
                {c.threshold !== undefined && (
                  <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>
                    阈值：{c.threshold}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => triggerExitCondition(c.id)}
                  className="text-[11px] px-2 py-1 rounded transition-colors"
                  style={{
                    backgroundColor: c.triggered ? "rgba(239,68,68,0.15)" : "var(--surface-card)",
                    color: c.triggered ? "var(--brand-red)" : "var(--muted-foreground)",
                  }}
                >
                  {c.triggered ? "撤销" : "触发"}
                </button>
                <button type="button" onClick={() => removeExit(c.id)}>
                  <Trash2 size={13} style={{ color: "var(--muted-foreground)" }} />
                </button>
              </div>
            </div>
          ))}

          {/* Add exit condition */}
          <div
            className="rounded-lg border p-3 space-y-2"
            style={cardStyle}
          >
            <p className="text-xs font-medium" style={{ color: "var(--foreground)" }}>添加撤退条件</p>
            <select
              className="w-full h-9 px-3 rounded-md text-sm border"
              style={inputStyle}
              value={newExit.type}
              onChange={(e) => setNewExit((p) => ({ ...p, type: e.target.value as ExitConditionType }))}
            >
              {(Object.keys(EXIT_CONDITION_LABELS) as ExitConditionType[]).map((t) => (
                <option key={t} value={t} style={{ backgroundColor: "var(--surface-card)" }}>
                  {EXIT_CONDITION_LABELS[t]}
                </option>
              ))}
            </select>
            <input
              className="w-full h-9 px-3 rounded-md text-sm border"
              style={inputStyle}
              placeholder="描述条件，如：跌破 105 元止损…"
              value={newExit.description}
              onChange={(e) => setNewExit((p) => ({ ...p, description: e.target.value }))}
            />
            <div className="flex gap-2">
              <input
                type="number"
                className="flex-1 h-9 px-3 rounded-md text-sm border"
                style={inputStyle}
                placeholder="阈值（选填）"
                value={newExit.threshold}
                onChange={(e) => setNewExit((p) => ({ ...p, threshold: e.target.value }))}
              />
              <button
                type="button"
                onClick={addExitCondition}
                className="h-9 px-4 rounded-md text-sm font-medium text-white"
                style={{ backgroundColor: "var(--brand-blue)" }}
              >
                添加
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 操作记录 ── */}
      {activeTab === "操作记录" && (
        <div className="space-y-2">
          {decisions.length === 0 && (
            <p className="text-sm text-center py-6" style={{ color: "var(--muted-foreground)" }}>
              该股票还没有决策卡记录
            </p>
          )}

          {decisions.map((d) => {
            const isBuy = d.action === "BUY" || d.action === "ADD";
            const actionColor = isBuy ? "var(--brand-red)" : "var(--brand-green)";
            return (
              <div
                key={d.id}
                className="flex items-start gap-3 rounded-lg border p-3"
                style={cardStyle}
              >
                <div
                  className="mt-0.5 px-2 py-0.5 rounded text-[11px] font-bold shrink-0"
                  style={{ backgroundColor: `${actionColor}22`, color: actionColor }}
                >
                  {ACTION_LABELS[d.action]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate" style={{ color: "var(--foreground)" }}>{d.reason}</p>
                  <div className="flex gap-3 mt-1 text-[11px]" style={{ color: "var(--muted-foreground)" }}>
                    <span>¥{d.price} × {d.quantity}股</span>
                    <span>F:{d.fomoScore} C:{d.calmScore}</span>
                    {d.dangerSignals.length > 0 && (
                      <span style={{ color: "var(--brand-warning)" }}>⚠ {d.dangerSignals.join(", ")}</span>
                    )}
                  </div>
                </div>
                <span className="text-[11px] shrink-0" style={{ color: "var(--muted-foreground)" }}>
                  {dayjs(d.createdAt).format("MM/DD")}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
