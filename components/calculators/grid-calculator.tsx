"use client";

import { useState } from "react";

export function GridCalculator() {
  const [low, setLow] = useState("");
  const [high, setHigh] = useState("");
  const [gridCount, setGridCount] = useState("10");
  const [amountPerGrid, setAmountPerGrid] = useState("10000");

  const lo = parseFloat(low) || 0;
  const hi = parseFloat(high) || 0;
  const gc = Math.min(Math.max(Math.floor(parseFloat(gridCount) || 0), 2), 50);
  const apg = parseFloat(amountPerGrid) || 0;

  const valid = lo > 0 && hi > lo && gc >= 2 && apg > 0;

  const step = valid ? (hi - lo) / gc : 0;
  const profitPerGrid = lo > 0 ? (step / lo) * 100 : 0;
  const totalCapital = gc * apg;

  const gridPrices: number[] = [];
  if (valid) {
    for (let i = 0; i <= gc; i++) {
      gridPrices.push(+(lo + step * i).toFixed(3));
    }
  }

  // Show only 8 rows
  const showPrices = gridPrices.slice(0, 8);
  const hasMore = gridPrices.length > 8;

  return (
    <div className="space-y-5">
      <p className="text-xs leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
        规划均匀网格交易区间，适合震荡行情的高抛低吸策略。
      </p>

      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "价格下限（元）", value: low, set: setLow, ph: "18.00" },
          { label: "价格上限（元）", value: high, set: setHigh, ph: "25.00" },
          { label: "网格数量", value: String(gc), set: (v: string) => setGridCount(v), ph: "10" },
          { label: "每格金额（元）", value: amountPerGrid, set: setAmountPerGrid, ph: "10000" },
        ].map(({ label, value, set, ph }) => (
          <div key={label}>
            <label className="block text-[11px] mb-1" style={{ color: "var(--muted-foreground)" }}>{label}</label>
            <input type="number" value={value} onChange={(e) => set(e.target.value)} placeholder={ph}
              className="w-full rounded-lg px-3 py-2 text-sm outline-none"
              style={{ backgroundColor: "var(--surface-overlay)", color: "var(--foreground)", border: "1px solid var(--border-subtle)" }} />
          </div>
        ))}
      </div>

      {valid && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "每格间距", value: `¥${step.toFixed(3)}` },
              { label: "单次网格收益", value: `${profitPerGrid.toFixed(2)}%` },
              { label: "总资金需求", value: `¥${totalCapital.toLocaleString()}` },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-lg border px-3 py-2.5 text-center"
                style={{ backgroundColor: "var(--surface-overlay)", borderColor: "var(--border-subtle)" }}>
                <div className="text-sm font-semibold" style={{ color: "var(--color-up)" }}>{value}</div>
                <div className="text-[10px] mt-0.5" style={{ color: "var(--muted-foreground)" }}>{label}</div>
              </div>
            ))}
          </div>

          <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--border-subtle)" }}>
            <div className="grid grid-cols-3 px-3 py-2 text-[11px] font-medium"
              style={{ backgroundColor: "var(--surface-overlay)", color: "var(--muted-foreground)" }}>
              <span>格位</span>
              <span className="text-right">价格</span>
              <span className="text-right">操作</span>
            </div>
            {showPrices.map((price, i) => (
              <div key={i} className="grid grid-cols-3 px-3 py-2 text-xs border-t"
                style={{ borderColor: "var(--border-subtle)", color: "var(--foreground)" }}>
                <span style={{ color: "var(--muted-foreground)" }}>第 {i + 1} 格</span>
                <span className="text-right">¥{price}</span>
                <span className="text-right text-[11px]"
                  style={{ color: i === 0 ? "var(--color-up)" : i === gridPrices.length - 1 ? "var(--color-down)" : "var(--muted-foreground)" }}>
                  {i === 0 ? "触底建仓" : i === gridPrices.length - 1 ? "触顶清仓" : `涨至此卖 / 跌至此买`}
                </span>
              </div>
            ))}
            {hasMore && (
              <div className="px-3 py-2 text-[11px] border-t" style={{ borderColor: "var(--border-subtle)", color: "var(--muted-foreground)" }}>
                …共 {gridPrices.length} 个格位，上限 ¥{gridPrices[gridPrices.length - 1]}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
