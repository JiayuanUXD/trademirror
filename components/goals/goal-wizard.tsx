"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Star, AlertTriangle, CheckCircle } from "lucide-react";
import { calcRequiredReturn, calcRealismScore } from "@/lib/goals-utils";

const BENCHMARKS = [
  { label: "银行定期存款", rate: 0.025, color: "var(--muted-foreground)" },
  { label: "沪深300 长期年化", rate: 0.08, color: "var(--brand-blue)" },
  { label: "优秀基金经理", rate: 0.18, color: "var(--brand-warning)" },
  { label: "巴菲特 50 年", rate: 0.20, color: "var(--brand-green)" },
];

const REALISM_CONFIG = [
  { score: 5, label: "非常合理", desc: "低于8%，长期坚持即可实现", color: "var(--brand-green)" },
  { score: 4, label: "有挑战但可达", desc: "8-15%，需要持续学习和纪律", color: "var(--brand-green)" },
  { score: 3, label: "需要优秀水平", desc: "15-25%，需要超越90%的投资者", color: "var(--brand-warning)" },
  { score: 2, label: "极有挑战", desc: "25-50%，巴菲特水平，请三思", color: "var(--brand-warning)" },
  { score: 1, label: "不建议设定", desc: "> 50%，这个目标会催生高风险操作", color: "var(--brand-red)" },
];

export function GoalWizard() {
  const router = useRouter();
  const [start, setStart] = useState("");
  const [target, setTarget] = useState("");
  const [years, setYears] = useState("3");
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const s = parseFloat(start) || 0;
  const t = parseFloat(target) || 0;
  const y = Math.min(Math.max(parseInt(years) || 1, 1), 30);

  const requiredReturn = s > 0 && t > 0 && y > 0 ? calcRequiredReturn(s, t, y) : null;
  const realismScore = requiredReturn !== null ? calcRealismScore(requiredReturn) : null;
  const config = realismScore !== null ? REALISM_CONFIG.find((r) => r.score === realismScore)! : null;
  const valid = s > 0 && t > 0 && y > 0;
  const isHighRisk = realismScore !== null && realismScore <= 2;

  async function handleSubmit() {
    if (!valid) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim() || undefined,
          startAmount: s,
          targetAmount: t,
          years: y,
          note: note.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const d = await res.json() as { error?: string };
        setError(d.error ?? "创建失败");
        return;
      }
      const goal = await res.json() as { id: string };
      router.push(`/goals/${goal.id}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Core inputs */}
      <div className="rounded-xl border p-5 space-y-4"
        style={{ backgroundColor: "var(--surface-card)", borderColor: "var(--border-subtle)" }}>
        <h2 className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>设定目标</h2>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] mb-1" style={{ color: "var(--muted-foreground)" }}>
              当前账户金额（元）
            </label>
            <input type="number" value={start} onChange={(e) => setStart(e.target.value)}
              placeholder="500000"
              className="w-full rounded-lg px-3 py-2 text-sm outline-none"
              style={{ backgroundColor: "var(--surface-overlay)", color: "var(--foreground)", border: "1px solid var(--border-subtle)" }} />
          </div>
          <div>
            <label className="block text-[11px] mb-1" style={{ color: "var(--muted-foreground)" }}>
              目标金额（元）
            </label>
            <input type="number" value={target} onChange={(e) => setTarget(e.target.value)}
              placeholder="1000000"
              className="w-full rounded-lg px-3 py-2 text-sm outline-none"
              style={{ backgroundColor: "var(--surface-overlay)", color: "var(--foreground)", border: "1px solid var(--border-subtle)" }} />
          </div>
        </div>

        {/* Year selector */}
        <div>
          <label className="block text-[11px] mb-2" style={{ color: "var(--muted-foreground)" }}>
            目标年数
          </label>
          <div className="flex gap-2">
            {[1, 2, 3, 5, 10].map((n) => (
              <button key={n} type="button"
                onClick={() => setYears(String(n))}
                className="flex-1 py-2 rounded-lg text-xs font-medium transition-colors"
                style={{
                  backgroundColor: y === n ? "rgba(99,102,241,0.15)" : "var(--surface-overlay)",
                  color: y === n ? "var(--brand-purple)" : "var(--muted-foreground)",
                  border: `1px solid ${y === n ? "rgba(99,102,241,0.3)" : "var(--border-subtle)"}`,
                }}>
                {n} 年
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-[11px] mb-1" style={{ color: "var(--muted-foreground)" }}>
            目标名称（可选）
          </label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder={`我的 ${y} 年投资计划`} maxLength={30}
            className="w-full rounded-lg px-3 py-2 text-sm outline-none"
            style={{ backgroundColor: "var(--surface-overlay)", color: "var(--foreground)", border: "1px solid var(--border-subtle)" }} />
        </div>
      </div>

      {/* Realism analysis */}
      {valid && requiredReturn !== null && config !== null && (
        <div className="rounded-xl border p-5 space-y-4"
          style={{ backgroundColor: "var(--surface-card)", borderColor: "var(--border-subtle)" }}>
          <h2 className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>目标分析</h2>

          {/* Required return + stars */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>需要年化收益率</p>
              <p className="text-3xl font-bold mt-0.5" style={{ color: config.color }}>
                {(requiredReturn * 100).toFixed(1)}%
              </p>
            </div>
            <div className="text-right">
              <div className="flex gap-0.5 justify-end">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} size={16}
                    fill={s <= (realismScore ?? 0) ? config.color : "transparent"}
                    style={{ color: config.color }} />
                ))}
              </div>
              <p className="text-xs mt-1 font-medium" style={{ color: config.color }}>{config.label}</p>
              <p className="text-[10px] mt-0.5" style={{ color: "var(--muted-foreground)" }}>{config.desc}</p>
            </div>
          </div>

          {/* Benchmark comparison */}
          <div className="space-y-2">
            <p className="text-[11px] font-medium" style={{ color: "var(--muted-foreground)" }}>
              与市场基准对比
            </p>
            {BENCHMARKS.map((b) => {
              const pct = b.rate * 100;
              const barW = Math.min((b.rate / Math.max(requiredReturn, 0.01)) * 100, 100);
              const isAbove = b.rate >= requiredReturn;
              return (
                <div key={b.label}>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span style={{ color: "var(--muted-foreground)" }}>{b.label}</span>
                    <span style={{ color: isAbove ? "var(--brand-green)" : "var(--muted-foreground)" }}>
                      {pct.toFixed(1)}% {isAbove ? "✓ 高于你的目标" : "低于你的目标"}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "var(--surface-overlay)" }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${barW}%`, backgroundColor: b.color }} />
                  </div>
                </div>
              );
            })}
            {/* User's goal line */}
            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span style={{ color: "var(--foreground)", fontWeight: 500 }}>你的目标</span>
                <span style={{ color: config.color }}>{(requiredReturn * 100).toFixed(1)}%</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "var(--surface-overlay)" }}>
                <div className="h-full rounded-full" style={{ width: "100%", backgroundColor: config.color }} />
              </div>
            </div>
          </div>

          {/* High risk warning */}
          {isHighRisk && (
            <div className="rounded-lg p-3 flex items-start gap-2"
              style={{ backgroundColor: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
              <AlertTriangle size={14} className="shrink-0 mt-0.5" style={{ color: "var(--brand-red)" }} />
              <div>
                <p className="text-xs font-medium" style={{ color: "var(--brand-red)" }}>这个目标需要极高年化收益率</p>
                <p className="text-[11px] mt-0.5" style={{ color: "var(--muted-foreground)" }}>
                  为了实现这个目标，你很可能会被迫高风险操作、频繁交易、重仓押注——
                  而这些行为恰恰是过去6年亏损的主要原因。
                  建议将目标降低或延长时间。
                </p>
                <label className="flex items-center gap-2 mt-2 cursor-pointer">
                  <input type="checkbox" checked={confirmed}
                    onChange={(e) => setConfirmed(e.target.checked)}
                    className="rounded" />
                  <span className="text-[11px]" style={{ color: "var(--foreground)" }}>
                    我了解风险，仍要设定此目标
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* Note */}
          <div>
            <label className="block text-[11px] mb-1" style={{ color: "var(--muted-foreground)" }}>
              备注（为什么设定这个目标？）
            </label>
            <textarea value={note} onChange={(e) => setNote(e.target.value)}
              rows={2} maxLength={100} placeholder="例：计划3年后够孩子上学的教育基金"
              className="w-full rounded-lg px-3 py-2 text-sm outline-none resize-none"
              style={{ backgroundColor: "var(--surface-overlay)", color: "var(--foreground)", border: "1px solid var(--border-subtle)" }} />
          </div>

          {error && <p className="text-xs" style={{ color: "var(--brand-red)" }}>{error}</p>}

          <button type="button" onClick={handleSubmit}
            disabled={saving || (isHighRisk && !confirmed)}
            className="w-full py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-40"
            style={{
              backgroundColor: "rgba(99,102,241,0.15)",
              color: "var(--brand-purple)",
              border: "1px solid rgba(99,102,241,0.3)",
            }}>
            <CheckCircle size={14} />
            {saving ? "创建中…" : "确认设定目标"}
          </button>
        </div>
      )}
    </div>
  );
}
