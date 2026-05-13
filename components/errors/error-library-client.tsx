"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";

export function ErrorLibraryClient() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleCreate() {
    if (!name.trim()) { setError("名称不能为空"); return; }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/errors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), description: desc.trim() }),
      });
      if (!res.ok) {
        const d = await res.json() as { error?: string };
        setError(d.error ?? "创建失败");
        return;
      }
      setOpen(false);
      setName("");
      setDesc("");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
        style={{
          backgroundColor: "rgba(99,102,241,0.12)",
          color: "var(--brand-purple)",
          border: "1px solid rgba(99,102,241,0.25)",
        }}
      >
        <Plus size={12} />
        新建类型
      </button>
    );
  }

  return (
    <div
      className="rounded-xl border p-4 space-y-3 w-72"
      style={{ backgroundColor: "var(--surface-card)", borderColor: "var(--border-subtle)" }}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
          新建错误类型
        </span>
        <button type="button" onClick={() => setOpen(false)}>
          <X size={14} style={{ color: "var(--muted-foreground)" }} />
        </button>
      </div>
      <input
        className="w-full rounded-lg px-3 py-2 text-sm outline-none"
        style={{
          backgroundColor: "var(--surface-overlay)",
          color: "var(--foreground)",
          border: "1px solid var(--border-subtle)",
        }}
        placeholder="错误名称（如：抄底过早）"
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={20}
      />
      <textarea
        className="w-full rounded-lg px-3 py-2 text-sm outline-none resize-none"
        style={{
          backgroundColor: "var(--surface-overlay)",
          color: "var(--foreground)",
          border: "1px solid var(--border-subtle)",
        }}
        placeholder="描述（可选）"
        rows={2}
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
        maxLength={60}
      />
      {error && (
        <p className="text-xs" style={{ color: "var(--brand-red)" }}>{error}</p>
      )}
      <button
        type="button"
        onClick={handleCreate}
        disabled={saving}
        className="w-full py-2 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
        style={{
          backgroundColor: "rgba(99,102,241,0.15)",
          color: "var(--brand-purple)",
          border: "1px solid rgba(99,102,241,0.25)",
        }}
      >
        {saving ? "创建中…" : "确认创建"}
      </button>
    </div>
  );
}
