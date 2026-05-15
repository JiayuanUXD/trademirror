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

      {/* Google sign-in */}
      <button
        type="button"
        onClick={() => signIn("google", { callbackUrl: "/" })}
        className="w-full flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-colors hover:opacity-90"
        style={{
          backgroundColor: "var(--surface-overlay)",
          color: "var(--foreground)",
          border: "1px solid var(--border-subtle)",
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
        </svg>
        使用 Google 登录
      </button>

      <div className="flex items-center gap-3 my-4">
        <div className="flex-1 h-px" style={{ backgroundColor: "var(--border-subtle)" }} />
        <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>或</span>
        <div className="flex-1 h-px" style={{ backgroundColor: "var(--border-subtle)" }} />
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
            className="w-full px-3 py-2 rounded-md text-sm outline-none"
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
            className="w-full px-3 py-2 rounded-md text-sm outline-none"
            style={{ backgroundColor: "var(--surface-overlay)", color: "var(--foreground)", border: "1px solid var(--border-subtle)" }}
            placeholder="请输入密码"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 rounded-md text-sm font-medium text-white transition-opacity disabled:opacity-50"
          style={{ backgroundColor: "var(--brand-blue)" }}
        >
          {loading ? "登录中..." : "登录"}
        </button>
      </form>

      <p className="text-sm text-center mt-6" style={{ color: "var(--muted-foreground)" }}>
        还没有账号？{" "}
        <Link href="/register" style={{ color: "var(--brand-blue)" }}>注册</Link>
      </p>
    </div>
  );
}