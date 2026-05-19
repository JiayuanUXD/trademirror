"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, ArrowLeft } from "lucide-react";

export default function DecisionDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[DecisionDetail] render error:", error);
  }, [error]);

  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-6 text-center">
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center"
        style={{ backgroundColor: "rgba(239,68,68,0.1)" }}
      >
        <RefreshCw size={22} style={{ color: "var(--brand-red)" }} />
      </div>

      <div className="space-y-1">
        <p className="text-base font-semibold" style={{ color: "var(--foreground)" }}>
          页面加载失败
        </p>
        <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
          数据库连接暂时中断，请重试
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/decisions")}
          className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg border transition-opacity hover:opacity-70"
          style={{
            borderColor: "var(--border-subtle)",
            color: "var(--muted-foreground)",
            backgroundColor: "var(--surface-card)",
          }}
        >
          <ArrowLeft size={14} />
          返回列表
        </button>
        <button
          onClick={reset}
          className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg transition-opacity hover:opacity-80"
          style={{
            backgroundColor: "var(--brand-blue)",
            color: "#fff",
          }}
        >
          <RefreshCw size={14} />
          重新加载
        </button>
      </div>
    </div>
  );
}
