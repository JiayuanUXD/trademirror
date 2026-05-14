"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileEdit, BarChart3, CheckCircle } from "lucide-react";
import { DisciplineScorer } from "./discipline-scorer";
import type { WeeklyReview, DisciplineItem } from "@/types/review";

type Props = { review: WeeklyReview };

const QUESTIONS = [
  { key: "bestThing" as const,  label: "本周做得最对的一件事？",          placeholder: "认真研究后再买入，没有追高…" },
  { key: "worstThing" as const, label: "本周做得最错的一件事？",          placeholder: "情绪化加仓，没有执行止损…" },
  { key: "doOver" as const,     label: "如果重来一次，我会怎么做？",      placeholder: "设好止损单再买，不盯盘…" },
];

export function ReviewForm({ review: initial }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [review, setReview] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const locked = review.status === "COMPLETED";

  async function patch(body: Record<string, unknown>) {
    const res = await fetch(`/api/reviews/${review.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const updated = await res.json() as WeeklyReview;
      startTransition(() => setReview(updated));
    }
    return res;
  }

  function handleTextChange(key: "bestThing" | "worstThing" | "doOver", val: string) {
    setReview((r) => ({ ...r, [key]: val }));
    setErrors((e) => { const n = { ...e }; delete n[key]; return n; });
  }

  async function handleTextBlur(key: "bestThing" | "worstThing" | "doOver") {
    if (locked) return;
    await patch({ [key]: review[key] });
  }

  async function handleDisciplineChange(items: DisciplineItem[]) {
    setReview((r) => ({ ...r, disciplineItems: items, disciplineTotal: items.reduce((s, i) => s + i.score, 0) }));
    await patch({ disciplineItems: items });
  }

  async function handleComplete() {
    const errs: Record<string, string> = {};
    if (!review.bestThing.trim()) errs.bestThing = "请填写本周最对的事";
    if (!review.worstThing.trim()) errs.worstThing = "请填写本周最错的事";
    if (!review.doOver.trim()) errs.doOver = "请填写如果重来会怎么做";
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    const res = await patch({
      bestThing: review.bestThing,
      worstThing: review.worstThing,
      doOver: review.doOver,
      disciplineItems: review.disciplineItems,
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
      {/* Three questions */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold flex items-center gap-1.5" style={{ color: "var(--foreground)" }}>
          <FileEdit size={16} className="text-brand-blue" /> 三问必填
        </h2>
        {QUESTIONS.map(({ key, label, placeholder }) => (
          <div key={key} className="space-y-1.5">
            <label className="text-xs font-medium" style={{ color: "var(--muted-foreground)" }}>
              {label}
            </label>
            <textarea
              className="w-full px-3 py-2 rounded-lg text-sm border resize-none"
              style={{
                backgroundColor: "var(--surface-overlay)",
                borderColor: errors[key] ? "var(--brand-red)" : "var(--border-subtle)",
                color: "var(--foreground)",
              }}
              rows={3}
              maxLength={100}
              placeholder={locked ? "" : placeholder}
              disabled={locked}
              value={review[key]}
              onChange={(e) => handleTextChange(key, e.target.value)}
              onBlur={() => handleTextBlur(key)}
            />
            <div className="flex justify-between">
              {errors[key] && <p className="text-[11px]" style={{ color: "var(--brand-red)" }}>{errors[key]}</p>}
              <span className="ml-auto text-[11px]" style={{ color: review[key].length > 90 ? "var(--brand-red)" : "var(--muted-foreground)" }}>
                {review[key].length}/100
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Discipline scorer */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold flex items-center gap-1.5" style={{ color: "var(--foreground)" }}>
          <BarChart3 size={16} className="text-brand-purple" /> 纪律打分（共7项，满分14）
        </h2>
        <DisciplineScorer
          items={review.disciplineItems}
          onChange={handleDisciplineChange}
          locked={locked}
        />
      </div>

      {/* Submit / locked state */}
      {!locked && (
        <div className="space-y-2">
          {errors.submit && (
            <p className="text-sm text-center" style={{ color: "var(--brand-red)" }}>{errors.submit}</p>
          )}
          <button
            type="button"
            onClick={handleComplete}
            className="w-full h-10 rounded-lg text-sm font-medium text-white transition-colors"
            style={{ backgroundColor: "var(--brand-blue)" }}
          >
            <span className="flex items-center justify-center gap-1.5">
              <CheckCircle size={16} /> 完成本周复盘
            </span>
          </button>
          <p className="text-center text-xs" style={{ color: "var(--muted-foreground)" }}>
            完成后三问将锁定，纪律分仍可修改
          </p>
        </div>
      )}

      {locked && (
        <div
          className="flex items-center gap-2 px-4 py-3 rounded-lg text-sm"
          style={{ backgroundColor: "rgba(34,197,94,0.08)", color: "var(--brand-green)", border: "1px solid rgba(34,197,94,0.2)" }}
        >
          <CheckCircle size={16} /> 本周复盘已完成
        </div>
      )}
    </div>
  );
}
