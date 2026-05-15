"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";

const PASSWORD_RULES = /^(?=.*[a-zA-Z])(?=.*[0-9]).{8,}$/;

export default function ChangePasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirm) {
      setError("两次输入的密码不一致");
      return;
    }

    if (!PASSWORD_RULES.test(password)) {
      setError("密码需至少8位，包含字母和数字");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "修改失败");
        setLoading(false);
        return;
      }

      // Sign out to refresh JWT with new passwordChangedAt
      await signOut({ callbackUrl: "/login" });
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
          修改初始密码
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--muted-foreground)" }}>
          首次登录需要设置一个新密码
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
            htmlFor="password"
            className="block text-sm font-medium mb-1"
            style={{ color: "var(--foreground)" }}
          >
            新密码
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
        </div>

        <div>
          <label
            htmlFor="confirm"
            className="block text-sm font-medium mb-1"
            style={{ color: "var(--foreground)" }}
          >
            确认密码
          </label>
          <input
            id="confirm"
            type="password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="w-full px-3 py-2 rounded-md text-sm outline-none transition-colors"
            style={{
              backgroundColor: "var(--surface-overlay)",
              color: "var(--foreground)",
              border: "1px solid var(--border-subtle)",
            }}
            placeholder="再次输入新密码"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 rounded-md text-sm font-medium text-white transition-opacity disabled:opacity-50"
          style={{ backgroundColor: "var(--brand-blue)" }}
        >
          {loading ? "修改中..." : "确认修改"}
        </button>
      </form>
    </div>
  );
}
