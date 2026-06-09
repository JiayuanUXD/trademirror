"use client";

import { useState } from "react";
import { Share2, Check, Loader2 } from "lucide-react";

type Props = { tradeDate: string };

export function DigestShareButton({ tradeDate }: Props) {
  const [state, setState] = useState<"idle" | "loading" | "copied">("idle");

  async function handleShare() {
    setState("loading");
    try {
      const res = await fetch("/api/digest/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tradeDate }),
      });
      if (!res.ok) throw new Error("Failed");

      const data = (await res.json()) as { token: string };
      const url = `${window.location.origin}/s/${data.token}`;

      await navigator.clipboard.writeText(url);
      setState("copied");
      setTimeout(() => setState("idle"), 2500);
    } catch {
      setState("idle");
    }
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      disabled={state === "loading"}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80 disabled:opacity-50"
      style={{
        backgroundColor: state === "copied" ? "rgba(34,197,94,0.1)" : "var(--surface-overlay)",
        color: state === "copied" ? "var(--brand-green)" : "var(--muted-foreground)",
        border: `1px solid ${state === "copied" ? "rgba(34,197,94,0.3)" : "var(--border-subtle)"}`,
      }}
    >
      {state === "loading" && <Loader2 size={13} className="animate-spin" />}
      {state === "copied" && <Check size={13} />}
      {state === "idle" && <Share2 size={13} />}
      {state === "copied" ? "已复制链接" : "分享"}
    </button>
  );
}
