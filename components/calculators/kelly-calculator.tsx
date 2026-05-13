"use client";

import { useState } from "react";

export function KellyCalculator() {
  const [winRate, setWinRate] = useState("45");
  const [avgWin, setAvgWin] = useState("8");
  const [avgLoss, setAvgLoss] = useState("4");

  const w = parseFloat(winRate) / 100 || 0;
  const wPct = parseFloat(avgWin) / 100 || 0;
  const lPct = parseFloat(avgLoss) / 100 || 0;

  const odds = lPct > 0 ? wPct / lPct : 0;
  const kelly = odds > 0 ? (w * odds - (1 - w)) / odds : 0;
  const halfKelly = kelly / 2;
  const valid = w > 0 && w < 1 && wPct > 0 && lPct > 0;

  function kellyColor(k: number) {
    if (k <= 0) return "var(--brand-red)";
    if (k > 0.5) return "var(--brand-warning)";
    return "var(--brand-green)";
  }

  function kellyAdvice(k: number) {
    if (k <= 0) return "负凯利 — 期望值为负，这个策略长期必亏，建议放弃";
    if (k < 0.1) return "凯利值偏低，策略优势不明显，建议轻仓";
    if (k < 0.25) return "凯利值合理，推荐使用 1/2 凯利（半凯利）控制风险";
    if (k < 0.5) return "凯利值较高，务必使用 1/2 凯利，全凯利波动剧烈";
    return "凯利值过高（常见于样本不足），建议使用 1/4 凯利";
  }

  return (
    <div className="space-y-5">
      <p className="text-xs leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
        根据历史胜率和盈亏比，计算单笔交易的最优仓位比例。
      </p>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "历史胜率（%）", value: winRate, set: setWinRate, hint: "赢的次数 / 总交易次数" },
          { label: "平均盈利（%）", value: avgWin, set: setAvgWin, hint: "盈利交易的平均涨幅" },
          { label: "平均亏损（%）", value: avgLoss, set: setAvgLoss, hint: "亏损交易的平均跌幅" },
        ].map(({ label, value, set, hint }) => (
          <div key={label}>
            <label className="block text-[11px] mb-0.5" style={{ color: "var(--muted-foreground)" }}>{label}</label>
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
            <p className="text-[10px] mt-0.5" style={{ color: "var(--muted-foreground)" }}>{hint}</p>
          </div>
        ))}
      </div>

      {valid && (
        <div className="space-y-3">
          <div className="rounded-xl border p-4" style={{ backgroundColor: "var(--surface-overlay)", borderColor: "var(--border-subtle)" }}>
            <p className="text-xs font-medium mb-3" style={{ color: "var(--muted-foreground)" }}>计算结果</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center py-3 rounded-lg" style={{ backgroundColor: "var(--surface-card)" }}>
                <div className="text-2xl font-bold" style={{ color: kellyColor(kelly) }}>
                  {kelly > 0 ? `${(kelly * 100).toFixed(1)}%` : "负值"}
                </div>
                <div className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>全凯利仓位</div>
              </div>
              <div className="text-center py-3 rounded-lg" style={{ backgroundColor: "var(--surface-card)" }}>
                <div className="text-2xl font-bold" style={{ color: halfKelly > 0 ? "var(--brand-green)" : "var(--brand-red)" }}>
                  {halfKelly > 0 ? `${(halfKelly * 100).toFixed(1)}%` : "—"}
                </div>
                <div className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>推荐仓位（半凯利）</div>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-center">
              <div>
                <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>盈亏比（赔率）</span>
                <div className="text-sm font-medium mt-0.5" style={{ color: "var(--foreground)" }}>
                  {odds.toFixed(2)} : 1
                </div>
              </div>
              <div>
                <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>期望值（每元）</span>
                <div className="text-sm font-medium mt-0.5" style={{ color: kelly > 0 ? "var(--brand-green)" : "var(--brand-red)" }}>
                  {((w * wPct - (1 - w) * lPct) * 100).toFixed(2)}%
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-lg px-3 py-2.5" style={{ backgroundColor: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)" }}>
            <p className="text-xs" style={{ color: "#818CF8" }}>{kellyAdvice(kelly)}</p>
          </div>
        </div>
      )}
    </div>
  );
}
