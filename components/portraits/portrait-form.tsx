"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, XCircle, Minus, Search, Target, MessageSquare } from "lucide-react";
import type { MonthlyPortrait, ProblemEval, ProblemId, ProblemEvalItem } from "@/types/portrait";
import { PROBLEM_DEFINITIONS, PROBLEM_IDS, NEXT_FOCUS_OPTIONS } from "@/types/portrait";

type Props = { portrait: MonthlyPortrait };

const EVAL_OPTIONS: { value: ProblemEval; label: string; icon: React.ReactNode; color: string }[] = [
  { value: "IMPROVED",  label: "改善", icon: <CheckCircle size={13} />, color: "var(--brand-green)" },
  { value: "STABLE",    label: "持平", icon: <Minus size={13} />,       color: "var(--muted-foreground)" },
  { value: "WORSENED",  label: "恶化", icon: <XCircle size={13} />,     color: "var(--brand-red)" },
];

export function PortraitForm({ portrait: initial }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [portrait, setPortrait] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const locked = portrait.status === "COMPLETED";

  async function patch(body: Record<string, unknown>) {
    const res = await fetch(`/api/portraits/${portrait.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const updated = await res.json() as MonthlyPortrait;
      startTransition(() => setPortrait(updated));
    }
    return res;
  }

  function setEval(id: ProblemId, value: ProblemEval) {
    if (locked) return;
    const next: ProblemEvalItem[] = portrait.problemEvals.map((p) =>
      p.id === id ? { ...p, eval: value } : p
    );
    setPortrait((p) => ({ ...p, problemEvals: next }));
    patch({ problemEvals: next });
  }

  async function handleComplete() {
    const errs: Record<string, string> = {};
    if (!portrait.reflection.trim()) errs.reflection = "请填写本月体悟";
    if (!portrait.nextFocus) errs.nextFocus = "请选择下月改进重点";
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    const res = await patch({
      reflection: portrait.reflection,
      nextFocus: portrait.nextFocus,
      problemEvals: portrait.problemEvals,
      complete: true,
    });
    if (res.ok) {
      router.refresh();
    } else {
      const data = await res.json() as { error?: string };
      setErrors({ submit: data.error ?? "提交失败" });
    }
  }

  return (
    <div className={`space-y-6 ${isPending ? "opacity-70 pointer-events-none" : ""}`}>

      {/* 6-problem evaluation */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold flex items-center gap-1.5" style={{ color: "var(--foreground)" }}>
          <Search size={16} className="text-brand-blue" /> 六大问题对照表
        </h2>
        <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
          对照本月数据，诚实评估每个问题的变化趋势
        </p>
        <div className="space-y-2">
          {PROBLEM_IDS.map((id) => {
            const def = PROBLEM_DEFINITIONS[id];
            const item = portrait.problemEvals.find((p) => p.id === id);
            const current = item?.eval ?? "STABLE";
            return (
              <div
                key={id}
                className="rounded-lg border px-3 py-2.5"
                style={{ backgroundColor: "var(--surface-overlay)", borderColor: "var(--border-subtle)" }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium" style={{ color: "var(--foreground)" }}>{def.label}</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>{def.desc}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {EVAL_OPTIONS.map(({ value, label, color }) => {
                      const active = current === value;
                      return (
                        <button
                          key={value}
                          type="button"
                          disabled={locked}
                          onClick={() => setEval(id, value)}
                          className="px-2 py-1 rounded text-[11px] font-medium transition-colors disabled:cursor-default"
                          style={{
                            backgroundColor: active ? `${color}22` : "transparent",
                            color: active ? color : "var(--muted-foreground)",
                            border: `1px solid ${active ? color : "var(--border-subtle)"}`,
                          }}
                        >
                          <div className="flex items-center gap-1">
                            {icon} {label}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Monthly reflection */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold flex items-center gap-1.5" style={{ color: "var(--foreground)" }}>
          <MessageSquare size={16} className="text-brand-purple" /> 本月体悟
        </h2>
        <textarea
          className="w-full px-3 py-2 rounded-lg text-sm border resize-none"
          style={{
            backgroundColor: "var(--surface-overlay)",
            borderColor: errors.reflection ? "var(--brand-red)" : "var(--border-subtle)",
            color: "var(--foreground)",
          }}
          rows={4}
          maxLength={500}
          placeholder="这个月最大的收获和感悟是什么？"
          disabled={locked}
          value={portrait.reflection}
          onChange={(e) => {
            setPortrait((p) => ({ ...p, reflection: e.target.value }));
            setErrors((err) => { const n = { ...err }; delete n.reflection; return n; });
          }}
          onBlur={() => { if (!locked) patch({ reflection: portrait.reflection }); }}
        />
        <div className="flex justify-between">
          {errors.reflection && <p className="text-[11px]" style={{ color: "var(--brand-red)" }}>{errors.reflection}</p>}
          <span className="ml-auto text-[11px]" style={{ color: portrait.reflection.length > 450 ? "var(--brand-red)" : "var(--muted-foreground)" }}>
            {portrait.reflection.length}/500
          </span>
        </div>
      </div>

      {/* Next month single focus */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold flex items-center gap-1.5" style={{ color: "var(--foreground)" }}>
          <Target size={16} className="text-brand-blue" /> 下月改进重点
        </h2>
        <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
          只选一个，力出一孔，不允许"全都要"
        </p>
        {errors.nextFocus && <p className="text-[11px]" style={{ color: "var(--brand-red)" }}>{errors.nextFocus}</p>}
        <div className="grid grid-cols-2 gap-2">
          {NEXT_FOCUS_OPTIONS.map(({ id, label }) => {
            const active = portrait.nextFocus === id;
            return (
              <button
                key={id}
                type="button"
                disabled={locked}
                onClick={() => {
                  if (locked) return;
                  const next = active ? "" : id;
                  setPortrait((p) => ({ ...p, nextFocus: next }));
                  setErrors((err) => { const n = { ...err }; delete n.nextFocus; return n; });
                  patch({ nextFocus: next });
                }}
                className="px-3 py-2 rounded-lg text-sm text-left transition-colors border disabled:cursor-default"
                style={{
                  backgroundColor: active ? "rgba(61,142,248,0.12)" : "var(--surface-overlay)",
                  borderColor: active ? "var(--brand-blue)" : "var(--border-subtle)",
                  color: active ? "var(--brand-blue)" : "var(--muted-foreground)",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Submit */}
      {!locked && (
        <div className="space-y-2">
          {errors.submit && <p className="text-sm text-center" style={{ color: "var(--brand-red)" }}>{errors.submit}</p>}
          <button
            type="button"
            onClick={handleComplete}
            className="w-full h-10 rounded-lg text-sm font-medium text-white"
            style={{ backgroundColor: "var(--brand-blue)" }}
          >
            <span className="flex items-center justify-center gap-1.5">
              <CheckCircle size={16} /> 完成本月画像
            </span>
          </button>
          <p className="text-center text-xs" style={{ color: "var(--muted-foreground)" }}>
            完成后体悟将锁定，问题评估仍可修改
          </p>
        </div>
      )}

      {locked && (
        <div
          className="flex items-center gap-2 px-4 py-3 rounded-lg text-sm"
          style={{ backgroundColor: "rgba(34,197,94,0.08)", color: "var(--brand-green)", border: "1px solid rgba(34,197,94,0.2)" }}
        >
          <CheckCircle size={16} /> 本月画像已完成
        </div>
      )}
    </div>
  );
}
