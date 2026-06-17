"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("邮箱或密码错误");
      return;
    }

    router.push("/");
    router.refresh();
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
          登录 TradeMirror
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--muted-foreground)" }}>
          不帮你预测市场，帮你看清自己
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
          <label htmlFor="email" className="block text-sm font-medium mb-1" style={{ color: "var(--foreground)" }}>
            邮箱
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2.5 rounded-md text-sm outline-none min-h-[44px]"
            style={{ backgroundColor: "var(--surface-overlay)", color: "var(--foreground)", border: "1px solid var(--border-subtle)" }}
            placeholder="请输入邮箱"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium mb-1" style={{ color: "var(--foreground)" }}>
            密码
          </label>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2.5 rounded-md text-sm outline-none min-h-[44px]"
            style={{ backgroundColor: "var(--surface-overlay)", color: "var(--foreground)", border: "1px solid var(--border-subtle)" }}
            placeholder="请输入密码"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 rounded-md text-sm font-medium text-white transition-opacity disabled:opacity-50 min-h-[44px]"
          style={{ backgroundColor: "var(--brand-blue)" }}
        >
          {loading ? "登录中..." : "登录"}
        </button>
      </form>

      <p className="text-sm text-center mt-6" style={{ color: "var(--muted-foreground)" }}>
        还没有账号？{" "}
        <Link href="/register" className="inline-block py-1 px-1" style={{ color: "var(--brand-blue)" }}>注册</Link>
      </p>
    </div>
  );
}