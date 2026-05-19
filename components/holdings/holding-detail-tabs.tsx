"use client";

import { useState, useRef } from "react";
import { Plus, Trash2, CheckSquare, Square, AlertTriangle, Check } from "lucide-react";
import type { Holding, LogicReason, Prerequisite, ExitCondition, ExitConditionType } from "@/types/holding";
import { EXIT_CONDITION_LABELS } from "@/types/holding";

// ─── Exit condition presets ───────────────────────────────────────────────────

type Preset = { type: ExitConditionType; label: string; description: string; threshold?: number };
type PresetGroup = { label: string; presets: Preset[] };

const PRESET_GROUPS: PresetGroup[] = [
  {
    label: "回撤止损",
    presets: [
      { type: "TRAILING_STOP", label: "-3%",  description: "从最高点回撤 3% 止损",  threshold: 3  },
      { type: "TRAILING_STOP", label: "-5%",  description: "从最高点回撤 5% 止损",  threshold: 5  },
      { type: "TRAILING_STOP", label: "-8%",  description: "从最高点回撤 8% 止损",  threshold: 8  },
      { type: "TRAILING_STOP", label: "-10%", description: "从最高点回撤 10% 止损", threshold: 10 },
      { type: "TRAILING_STOP", label: "-15%", description: "从最高点回撤 15% 止损", threshold: 15 },
      { type: "TRAILING_STOP", label: "-20%", description: "从最高点回撤 20% 止损", threshold: 20 },
    ],
  },
  {
    label: "均线",
    presets: [
      { type: "TECH_BREAK", label: "5日线",  description: "跌破 5 日均线" },
      { type: "TECH_BREAK", label: "10日线", description: "跌破 10 日均线" },
      { type: "TECH_BREAK", label: "20日线", description: "跌破 20 日均线" },
      { type: "TECH_BREAK", label: "60日线", description: "跌破 60 日均线" },
      { type: "TECH_BREAK", label: "前低",   description: "跌破前期低点" },
    ],
  },
  {
    label: "基本面",
    presets: [
      { type: "EARNINGS_BELOW", label: "业绩下滑",   description: "连续两季度营收/利润同比下滑" },
      { type: "EARNINGS_BELOW", label: "增速不达预期", description: "业绩增速低于预期目标" },
      { type: "CUSTOM",         label: "逻辑失效",   description: "持有逻辑出现根本性变化" },
      { type: "CUSTOM",         label: "估值泡沫",   description: "估值严重高估，超历史均值两倍以上" },
    ],
  },
];
import type { Decision } from "@/types/decision";
import { ACTION_LABELS } from "@/types/decision";
import dayjs from "dayjs";

type Props = { holding: Holding; decisions: Decision[] };

const TABS = ["持有逻辑", "持有前提", "撤退条件", "操作记录"] as const;
type Tab = (typeof TABS)[number];

export function HoldingDetailTabs({ holding: initial, decisions }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("持有逻辑");
  const [holding, setHolding] = useState(initial);
  // Track in-flight request count for a subtle sync indicator (optional future use)
  const syncCount = useRef(0);

  /**
   * Optimistic mutate: update UI instantly, sync to server in background.
   * On server error, silently rolls back to the previous state.
   */
  function mutate(next: Holding) {
    const prev = holding;
    setHolding(next);
    syncCount.current += 1;

    fetch(`/api/holdings/${next.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reasons:        next.logic.reasons,
        moat:           next.logic.moat,
        keyFinancials:  next.logic.keyFinancials,
        prerequisites:  next.prerequisites,
        exitConditions: next.exitConditions,
      }),
    })
      .then((r) => { if (!r.ok) setHolding(prev); })
      .catch(() => setHolding(prev))
      .finally(() => { syncCount.current -= 1; });
  }

  // ── Logic Tab ──
  const [newReason, setNewReason] = useState("");

  function addReason() {
    if (!newReason.trim()) return;
    mutate({
      ...holding,
      logic: {
        ...holding.logic,
        reasons: [...holding.logic.reasons, { id: crypto.randomUUID(), content: newReason.trim(), hasData: false, isVerifiable: false }],
      },
    });
    setNewReason("");
  }

  function removeReason(id: string) {
    mutate({ ...holding, logic: { ...holding.logic, reasons: holding.logic.reasons.filter((r) => r.id !== id) } });
  }

  function toggleReasonFlag(id: string, flag: "hasData" | "isVerifiable") {
    mutate({
      ...holding,
      logic: {
        ...holding.logic,
        reasons: holding.logic.reasons.map((r) => r.id === id ? { ...r, [flag]: !r[flag] } : r),
      },
    });
  }

  // ── Prerequisites Tab ──
  const [newPrereq, setNewPrereq] = useState("");

  function addPrereq() {
    if (!newPrereq.trim()) return;
    mutate({ ...holding, prerequisites: [...holding.prerequisites, { id: crypto.randomUUID(), content: newPrereq.trim(), checked: false }] });
    setNewPrereq("");
  }

  function togglePrereq(id: string) {
    mutate({ ...holding, prerequisites: holding.prerequisites.map((p) => p.id === id ? { ...p, checked: !p.checked } : p) });
  }

  function removePrereq(id: string) {
    mutate({ ...holding, prerequisites: holding.prerequisites.filter((p) => p.id !== id) });
  }

  // ── Exit Conditions Tab ──
  const [customExitDesc, setCustomExitDesc] = useState("");

  function addPreset(preset: Preset) {
    mutate({
      ...holding,
      exitConditions: [...holding.exitConditions, {
        id: crypto.randomUUID(),
        type: preset.type,
        description: preset.description,
        ...(preset.threshold !== undefined && { threshold: preset.threshold }),
        triggered: false,
      }],
    });
  }

  function addCustomExit() {
    if (!customExitDesc.trim()) return;
    mutate({ ...holding, exitConditions: [...holding.exitConditions, { id: crypto.randomUUID(), type: "CUSTOM", description: customExitDesc.trim(), triggered: false }] });
    setCustomExitDesc("");
  }

  function triggerExitCondition(id: string) {
    mutate({ ...holding, exitConditions: holding.exitConditions.map((c) => c.id === id ? { ...c, triggered: !c.triggered } : c) });
  }

  function removeExit(id: string) {
    mutate({ ...holding, exitConditions: holding.exitConditions.filter((c) => c.id !== id) });
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
    <div>
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
              style={{ ...cardStyle, borderColor: c.triggered ? "var(--color-down)" : "var(--border-subtle)" }}
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
                    <span className="text-[10px] flex items-center gap-1" style={{ color: "var(--color-down)" }}>
                      <AlertTriangle size={10} /> 已触发
                    </span>
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
                    backgroundColor: c.triggered ? "rgba(34,197,94,0.15)" : "var(--surface-card)",
                    color: c.triggered ? "var(--color-down)" : "var(--muted-foreground)",
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

          {/* Quick presets + custom input */}
          <div className="rounded-lg border p-3 space-y-3" style={cardStyle}>
            <p className="text-xs font-medium" style={{ color: "var(--foreground)" }}>快速添加</p>

            {PRESET_GROUPS.map((group) => (
              <div key={group.label} className="space-y-1.5">
                <p className="text-[10px] font-medium uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>
                  {group.label}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {group.presets.map((preset) => {
                    const added = holding.exitConditions.some((c) => c.description === preset.description);
                    return (
                      <button
                        key={preset.label}
                        type="button"
                        disabled={added}
                        onClick={() => addPreset(preset)}
                        className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border transition-all"
                        style={{
                          borderColor: added ? "transparent" : "var(--border-subtle)",
                          backgroundColor: added ? "rgba(34,197,94,0.1)" : "var(--surface-card)",
                          color: added ? "var(--brand-green)" : "var(--muted-foreground)",
                          cursor: added ? "default" : "pointer",
                        }}
                      >
                        {added && <Check size={10} />}
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Custom free-text */}
            <div className="pt-1 flex gap-2" style={{ borderTop: "1px solid var(--border-subtle)" }}>
              <input
                className="flex-1 h-8 px-3 rounded-md text-xs border"
                style={inputStyle}
                placeholder="自定义条件，回车添加…"
                value={customExitDesc}
                onChange={(e) => setCustomExitDesc(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addCustomExit()}
              />
              <button
                type="button"
                onClick={addCustomExit}
                disabled={!customExitDesc.trim()}
                className="h-8 px-3 rounded-md text-white disabled:opacity-40 transition-opacity"
                style={{ backgroundColor: "var(--brand-blue)" }}
              >
                <Plus size={13} />
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
            const actionColor = isBuy ? "var(--color-up)" : "var(--color-down)";
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
                      <span className="flex items-center gap-1" style={{ color: "var(--brand-warning)" }}>
                        <AlertTriangle size={10} /> {d.dangerSignals.join(", ")}
                      </span>
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
