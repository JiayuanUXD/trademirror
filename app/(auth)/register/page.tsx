"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "注册失败");
        setLoading(false);
        return;
      }

      // Auto-login after registration
      const { signIn } = await import("next-auth/react");
      await signIn("credentials", { email, password, redirect: false });
      router.push("/");
      router.refresh();
    } catch {
      setError("网络错误，请重试");
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm px-6">
      <div className="text-center mb-8">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-lg font-bold mx-auto mb-3"
          style={{ backgroundColor: "var(--brand-blue)" }}
        >
          T
        </div>
        <h1 className="text-lg font-semibold" style={{ color: "var(--foreground)" }}>
          注册 TradeMirror
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--muted-foreground)" }}>
          创建你的交易日志账户
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div
            className="text-sm px-3 py-2 rounded-md"
            style={{
              backgroundColor: "rgba(239,68,68,0.1)",
              color: "var(--brand-red)",
              border: "1px solid rgba(239,68,68,0.2)",
            }}
          >
            {error}
          </div>
        )}

        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium mb-1"
            style={{ color: "var(--foreground)" }}
          >
            展示名
          </label>
          <input
            id="name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 rounded-md text-sm outline-none transition-colors"
            style={{
              backgroundColor: "var(--surface-overlay)",
              color: "var(--foreground)",
              border: "1px solid var(--border-subtle)",
            }}
            placeholder="你的昵称"
          />
        </div>

        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium mb-1"
            style={{ color: "var(--foreground)" }}
          >
            邮箱
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 rounded-md text-sm outline-none transition-colors"
            style={{
              backgroundColor: "var(--surface-overlay)",
              color: "var(--foreground)",
              border: "1px solid var(--border-subtle)",
            }}
            placeholder="your@email.com"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium mb-1"
            style={{ color: "var(--foreground)" }}
          >
            密码
          </label>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 rounded-md text-sm outline-none transition-colors"
            style={{
              backgroundColor: "var(--surface-overlay)",
              color: "var(--foreground)",
              border: "1px solid var(--border-subtle)",
            }}
            placeholder="至少8位，含字母和数字"
          />
          <p className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>
            至少8位，需包含字母和数字
          </p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 rounded-md text-sm font-medium text-white transition-opacity disabled:opacity-50"
          style={{ backgroundColor: "var(--brand-blue)" }}
        >
          {loading ? "注册中..." : "注册"}
        </button>
      </form>

      <p className="text-sm text-center mt-6" style={{ color: "var(--muted-foreground)" }}>
        已有账号？{" "}
        <Link href="/login" style={{ color: "var(--brand-blue)" }}>
          登录
        </Link>
      </p>
    </div>
  );
}
