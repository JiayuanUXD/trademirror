"use client";

import { useState } from "react";
import { Trash2, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";

export function DeleteReviewButton({ reviewId }: { reviewId: string }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    setLoading(true);
    try {
      await fetch(`/api/reviews/${reviewId}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setLoading(false);
      setConfirm(false);
    }
  }

  if (confirm) {
    return (
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="text-[11px] flex items-center gap-1" style={{ color: "var(--brand-warning)" }}>
          <AlertTriangle size={11} /> 确认删除？
        </span>
        <button
          onClick={(e) => { e.preventDefault(); void handleDelete(); }}
          disabled={loading}
          className="text-[11px] px-2 py-0.5 rounded font-medium disabled:opacity-50"
          style={{ backgroundColor: "rgba(239,68,68,0.12)", color: "var(--brand-red)" }}
        >
          {loading ? "删除中…" : "确认"}
        </button>
        <button
          onClick={(e) => { e.preventDefault(); setConfirm(false); }}
          className="text-[11px] px-2 py-0.5 rounded"
          style={{ color: "var(--muted-foreground)", backgroundColor: "var(--surface-overlay)" }}
        >
          取消
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={(e) => { e.preventDefault(); setConfirm(true); }}
      className="shrink-0 p-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity"
      style={{ color: "var(--muted-foreground)" }}
      title="删除复盘"
    >
      <Trash2 size={14} />
    </button>
  );
}
