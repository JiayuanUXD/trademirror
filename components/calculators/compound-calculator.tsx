"use client";

import { useState } from "react";

export function CompoundCalculator() {
  const [principal, setPrincipal] = useState("500000");
  const [rate, setRate] = useState("15");
  const [years, setYears] = useState("5");

  const p = parseFloat(principal) || 0;
  const r = parseFloat(rate) / 100 || 0;
  const n = Math.min(Math.max(Math.floor(parseFloat(years) || 0), 1), 30);
  const valid = p > 0 && r > -1 && n > 0;

  // Year-by-year table (max 10 rows shown)
  const rows: { year: number; amount: number; gain: number; pct: number }[] = [];
  if (valid) {
    for (let i = 1; i <= n; i++) {
      const amt = p * Math.pow(1 + r, i);
      rows.push({ year: i, amount: amt, gain: amt - p, pct: ((amt - p) / p) * 100 });
    }
  }

  const final = rows[rows.length - 1]?.amount ?? 0;
  const totalGain = final - p;

  // Benchmarks
  const benchmarks = [
    { label: "沪深300 长期年化", rate: 0.08 },
    { label: "优秀基金经理", rate: 0.18 },
    { label: "巴菲特", rate: 0.20 },
  ];

  return (
    <div className="space-y-5">
      <p className="text-xs leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
        计算复利效应——让你直观看到长期坚持有效策略的价值。
      </p>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "初始本金（元）", value: principal, set: setPrincipal },
          { label: "年化收益率（%）", value: rate, set: setRate },
          { label: "年数（1-30）", value: String(n), set: (v: string) => setYears(v) },
        ].map(({ label, value, set }) => (
          <div key={label}>
            <label className="block text-[11px] mb-1" style={{ color: "var(--muted-foreground)" }}>{label}</label>
            <input
              type="number"
              value={value}
              onChange={(e) => set(e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-sm outline-none"
              style={{
                backgroundColor: "var(--surface-overlay)",
                color: "var(--foreground)",
                border: "1px solid var(--border-subtle)",
              }}
            />
          </div>
        ))}
      </div>

      {valid && (
        <div className="space-y-3">
          {/* Summary */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border px-4 py-3 text-center"
              style={{ backgroundColor: "var(--surface-overlay)", borderColor: "var(--border-subtle)" }}>
              <div className="text-xl font-bold" style={{ color: "var(--brand-green)" }}>
                ¥{Math.round(final).toLocaleString()}
              </div>
              <div className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>{n} 年后</div>
            </div>
            <div className="rounded-xl border px-4 py-3 text-center"
              style={{ backgroundColor: "var(--surface-overlay)", borderColor: "var(--border-subtle)" }}>
              <div className="text-xl font-bold" style={{ color: totalGain >= 0 ? "var(--brand-green)" : "var(--brand-red)" }}>
                {totalGain >= 0 ? "+" : ""}¥{Math.round(Math.abs(totalGain)).toLocaleString()}
              </div>
              <div className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>
                总收益 {totalGain >= 0 ? "+" : ""}{((totalGain / p) * 100).toFixed(0)}%
              </div>
            </div>
          </div>

          {/* Year table */}
          <div className="rounded-xl border overflow-hidden"
            style={{ borderColor: "var(--border-subtle)" }}>
            <div className="grid grid-cols-4 px-3 py-2 text-[11px] font-medium"
              style={{ backgroundColor: "var(--surface-overlay)", color: "var(--muted-foreground)" }}>
              <span>年份</span><span className="text-right">账户金额</span>
              <span className="text-right">总收益</span><span className="text-right">增幅</span>
            </div>
            {rows.slice(0, 10).map((row) => (
              <div key={row.year} className="grid grid-cols-4 px-3 py-2 text-xs border-t"
                style={{ borderColor: "var(--border-subtle)", color: "var(--foreground)" }}>
                <span style={{ color: "var(--muted-foreground)" }}>第 {row.year} 年</span>
                <span className="text-right">¥{Math.round(row.amount).toLocaleString()}</span>
                <span className="text-right" style={{ color: "var(--brand-green)" }}>
                  +¥{Math.round(row.gain).toLocaleString()}
                </span>
                <span className="text-right" style={{ color: "var(--brand-green)" }}>
                  +{row.pct.toFixed(0)}%
                </span>
              </div>
            ))}
            {n > 10 && (
              <div className="px-3 py-2 text-xs border-t" style={{ borderColor: "var(--border-subtle)", color: "var(--muted-foreground)" }}>
                …第 {n} 年：¥{Math.round(final).toLocaleString()}
              </div>
            )}
          </div>

          {/* Benchmarks */}
          <div className="rounded-xl border p-4"
            style={{ backgroundColor: "var(--surface-overlay)", borderColor: "var(--border-subtle)" }}>
            <p className="text-xs font-medium mb-2" style={{ color: "var(--muted-foreground)" }}>
              同等年数，不同年化率对比
            </p>
            {benchmarks.map((b) => {
              const bFinal = p * Math.pow(1 + b.rate, n);
              return (
                <div key={b.label} className="flex justify-between py-1.5 border-b last:border-0"
                  style={{ borderColor: "var(--border-subtle)" }}>
                  <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                    {b.label}（{(b.rate * 100).toFixed(0)}%）
                  </span>
                  <span className="text-xs font-medium" style={{ color: "var(--foreground)" }}>
                    ¥{Math.round(bFinal).toLocaleString()}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
