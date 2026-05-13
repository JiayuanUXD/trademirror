"use client";

import { useState } from "react";
import { Sparkles, RefreshCw } from "lucide-react";

export function InsightCard() {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [generated, setGenerated] = useState(false);

  async function generate() {
    setLoading(true);
    setError("");
    setText("");
    setGenerated(false);

    try {
      const res = await fetch("/api/insights", { method: "POST" });

      if (!res.ok) {
        const data = await res.json() as { error?: string };
        setError(data.error ?? "生成失败，请重试");
        return;
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) { setError("流式响应失败"); return; }

      let accumulated = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setText(accumulated);
      }
      setGenerated(true);
    } catch {
      setError("网络错误，请检查连接后重试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="rounded-xl border p-5 space-y-4"
      style={{ backgroundColor: "var(--surface-card)", borderColor: "var(--border-subtle)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: "rgba(139,92,246,0.15)" }}
          >
            <Sparkles size={14} style={{ color: "var(--brand-purple)" }} />
          </div>
          <div>
            <h3 className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
              AI 行为洞察
            </h3>
            <p className="text-[11px]" style={{ color: "var(--muted-foreground)" }}>
              基于过去 30 天的真实数据生成
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={generate}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
          style={{
            backgroundColor: loading ? "var(--surface-overlay)" : "rgba(139,92,246,0.15)",
            color: "var(--brand-purple)",
            border: "1px solid rgba(139,92,246,0.25)",
          }}
        >
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          {loading ? "生成中…" : generated ? "重新生成" : "生成洞察"}
        </button>
      </div>

      {/* Content area */}
      {!generated && !loading && !error && (
        <div
          className="rounded-lg px-4 py-6 text-center"
          style={{ backgroundColor: "var(--surface-overlay)" }}
        >
          <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
            点击"生成洞察"，AI 将分析你的交易模式并给出针对性建议
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--muted-foreground)", opacity: 0.6 }}>
            需要配置 DEEPSEEK_API_KEY · 每次生成约消耗 500 tokens
          </p>
        </div>
      )}

      {loading && text === "" && (
        <div
          className="rounded-lg px-4 py-6 text-center"
          style={{ backgroundColor: "var(--surface-overlay)" }}
        >
          <div className="flex items-center justify-center gap-2" style={{ color: "var(--brand-purple)" }}>
            <RefreshCw size={14} className="animate-spin" />
            <span className="text-sm">正在分析你的交易行为…</span>
          </div>
        </div>
      )}

      {(text || loading) && text !== "" && (
        <div
          className="rounded-lg px-4 py-4"
          style={{ backgroundColor: "var(--surface-overlay)", borderLeft: "3px solid var(--brand-purple)" }}
        >
          <p
            className="text-sm leading-relaxed whitespace-pre-wrap"
            style={{ color: "var(--foreground)" }}
          >
            {text}
            {loading && (
              <span
                className="inline-block w-0.5 h-4 ml-0.5 align-middle animate-pulse"
                style={{ backgroundColor: "var(--brand-purple)" }}
              />
            )}
          </p>
        </div>
      )}

      {error && (
        <div
          className="rounded-lg px-4 py-3 text-sm"
          style={{
            backgroundColor: "rgba(239,68,68,0.08)",
            color: "var(--brand-red)",
            border: "1px solid rgba(239,68,68,0.2)",
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
}
