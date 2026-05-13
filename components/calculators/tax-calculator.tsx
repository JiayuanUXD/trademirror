"use client";

import { useState } from "react";

export function TaxCalculator() {
  const [buyPrice, setBuyPrice] = useState("");
  const [sellPrice, setSellPrice] = useState("");
  const [shares, setShares] = useState("");
  const [commission, setCommission] = useState("0.025"); // 万分之2.5
  const [market, setMarket] = useState<"SH" | "SZ">("SH");

  const bp = parseFloat(buyPrice) || 0;
  const sp = parseFloat(sellPrice) || 0;
  const sh = Math.floor(parseFloat(shares) || 0);
  const commRate = parseFloat(commission) / 10000 || 0;

  const buyAmount = bp * sh;
  const sellAmount = sp * sh;
  const valid = bp > 0 && sp > 0 && sh > 0;

  // 佣金（双向，最低5元/笔）
  const buyComm = Math.max(buyAmount * commRate, 5);
  const sellComm = Math.max(sellAmount * commRate, 5);

  // 印花税（仅卖出，0.1%）
  const stampDuty = sellAmount * 0.001;

  // 过户费（仅上交所，双向，万分之0.2）
  const transferFee = market === "SH" ? (buyAmount + sellAmount) * 0.00002 : 0;

  const totalFee = buyComm + sellComm + stampDuty + transferFee;
  const grossProfit = sellAmount - buyAmount;
  const netProfit = grossProfit - totalFee;
  const grossPct = buyAmount > 0 ? (grossProfit / buyAmount) * 100 : 0;
  const netPct = buyAmount > 0 ? (netProfit / buyAmount) * 100 : 0;
  const feePct = buyAmount > 0 ? (totalFee / buyAmount) * 100 : 0;

  const fmtMoney = (n: number) =>
    `${n >= 0 ? "+" : ""}¥${Math.abs(n).toFixed(2)}`;

  return (
    <div className="space-y-5">
      <p className="text-xs leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
        计算 A 股交易的印花税、佣金、过户费及净收益。
      </p>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] mb-1" style={{ color: "var(--muted-foreground)" }}>买入价（元）</label>
          <input type="number" value={buyPrice} onChange={(e) => setBuyPrice(e.target.value)}
            placeholder="20.00" className="w-full rounded-lg px-3 py-2 text-sm outline-none"
            style={{ backgroundColor: "var(--surface-overlay)", color: "var(--foreground)", border: "1px solid var(--border-subtle)" }} />
        </div>
        <div>
          <label className="block text-[11px] mb-1" style={{ color: "var(--muted-foreground)" }}>卖出价（元）</label>
          <input type="number" value={sellPrice} onChange={(e) => setSellPrice(e.target.value)}
            placeholder="22.00" className="w-full rounded-lg px-3 py-2 text-sm outline-none"
            style={{ backgroundColor: "var(--surface-overlay)", color: "var(--foreground)", border: "1px solid var(--border-subtle)" }} />
        </div>
        <div>
          <label className="block text-[11px] mb-1" style={{ color: "var(--muted-foreground)" }}>股数</label>
          <input type="number" value={shares} onChange={(e) => setShares(e.target.value)}
            placeholder="1000" className="w-full rounded-lg px-3 py-2 text-sm outline-none"
            style={{ backgroundColor: "var(--surface-overlay)", color: "var(--foreground)", border: "1px solid var(--border-subtle)" }} />
        </div>
        <div>
          <label className="block text-[11px] mb-1" style={{ color: "var(--muted-foreground)" }}>佣金率（万分之）</label>
          <input type="number" value={commission} onChange={(e) => setCommission(e.target.value)}
            placeholder="2.5" step="0.1" className="w-full rounded-lg px-3 py-2 text-sm outline-none"
            style={{ backgroundColor: "var(--surface-overlay)", color: "var(--foreground)", border: "1px solid var(--border-subtle)" }} />
        </div>
      </div>

      {/* Market selector */}
      <div className="flex gap-2">
        {(["SH", "SZ"] as const).map((m) => (
          <button key={m} type="button" onClick={() => setMarket(m)}
            className="px-4 py-1.5 rounded-lg text-xs font-medium transition-colors"
            style={{
              backgroundColor: market === m ? "rgba(99,102,241,0.15)" : "var(--surface-overlay)",
              color: market === m ? "var(--brand-purple)" : "var(--muted-foreground)",
              border: `1px solid ${market === m ? "rgba(99,102,241,0.3)" : "var(--border-subtle)"}`,
            }}>
            {m === "SH" ? "上交所（沪）" : "深交所（深）"}
          </button>
        ))}
      </div>

      {valid && (
        <div className="rounded-xl border p-4 space-y-0"
          style={{ backgroundColor: "var(--surface-overlay)", borderColor: "var(--border-subtle)" }}>
          {[
            { label: "买入金额", value: `¥${buyAmount.toLocaleString()}`, dim: true },
            { label: "卖出金额", value: `¥${sellAmount.toLocaleString()}`, dim: true },
            { label: "买入佣金", value: `-¥${buyComm.toFixed(2)}`, red: true },
            { label: "卖出佣金", value: `-¥${sellComm.toFixed(2)}`, red: true },
            { label: "印花税（卖出 0.1%）", value: `-¥${stampDuty.toFixed(2)}`, red: true },
            { label: `过户费${market === "SH" ? "（沪，双向）" : "（深，无）"}`, value: market === "SH" ? `-¥${transferFee.toFixed(2)}` : "—", red: market === "SH" },
            null, // divider
            { label: "总税费", value: `-¥${totalFee.toFixed(2)} (${feePct.toFixed(3)}%)`, red: true },
            { label: "税前利润", value: `${fmtMoney(grossProfit)} (${grossPct.toFixed(2)}%)`, green: grossProfit > 0, red: grossProfit < 0 },
            { label: "税后净利润", value: `${fmtMoney(netProfit)} (${netPct.toFixed(2)}%)`, green: netProfit > 0, red: netProfit < 0 },
          ].map((row, i) =>
            row === null ? (
              <div key={i} className="border-t my-1" style={{ borderColor: "var(--border-subtle)" }} />
            ) : (
              <div key={row.label} className="flex justify-between py-1.5">
                <span className="text-xs" style={{ color: row.dim ? "var(--muted-foreground)" : "var(--foreground)" }}>
                  {row.label}
                </span>
                <span className="text-xs font-medium" style={{
                  color: row.green ? "var(--brand-green)" : row.red ? "var(--brand-red)" : "var(--foreground)"
                }}>
                  {row.value}
                </span>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
