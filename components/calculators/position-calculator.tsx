"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2 border-b last:border-0"
      style={{ borderColor: "var(--border-subtle)" }}>
      <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>{label}</span>
      <span className="text-sm font-semibold"
        style={{ color: highlight ? "var(--color-up)" : "var(--foreground)" }}>{value}</span>
    </div>
  );
}

export function PositionCalculator() {
  const [capital, setCapital] = useState("500000");
  const [entry, setEntry] = useState("");
  const [stop, setStop] = useState("");
  const [maxLossPct, setMaxLossPct] = useState("2");

  const c = parseFloat(capital) || 0;
  const e = parseFloat(entry) || 0;
  const s = parseFloat(stop) || 0;
  const p = parseFloat(maxLossPct) || 0;

  const maxLoss = c * (p / 100);
  const diff = e - s;
  const rawShares = diff > 0 ? maxLoss / diff : 0;
  const lots = Math.floor(rawShares / 100);
  const shares = lots * 100;
  const amount = shares * e;
  const positionPct = c > 0 ? (amount / c) * 100 : 0;
  const valid = c > 0 && e > 0 && s > 0 && s < e && p > 0;

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
          根据你的总资金、止损位和单笔最大亏损比例，计算合理买入股数。
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "总资金（元）", value: capital, set: setCapital, placeholder: "500000" },
          { label: "计划买入价（元）", value: entry, set: setEntry, placeholder: "20.50" },
          { label: "止损价（元）", value: stop, set: setStop, placeholder: "18.00" },
          { label: "单笔最大亏损（%）", value: maxLossPct, set: setMaxLossPct, placeholder: "2" },
        ].map(({ label, value, set, placeholder }) => (
          <div key={label}>
            <label className="block text-[11px] mb-1" style={{ color: "var(--muted-foreground)" }}>{label}</label>
            <input
              type="number"
              value={value}
              onChange={(e) => set(e.target.value)}
              placeholder={placeholder}
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

      {valid ? (
        <div className="rounded-xl border p-4" style={{ backgroundColor: "var(--surface-overlay)", borderColor: "var(--border-subtle)" }}>
          <p className="text-xs font-medium mb-3" style={{ color: "var(--muted-foreground)" }}>计算结果</p>
          <Row label="最大可亏金额" value={`¥${maxLoss.toLocaleString()}`} />
          <Row label="单股风险（每股亏损）" value={`¥${diff.toFixed(2)}`} />
          <Row label="理论股数" value={`${Math.floor(rawShares).toLocaleString()} 股`} />
          <Row label="建议买入（取整手）" value={`${shares.toLocaleString()} 股`} highlight />
          <Row label="建议买入金额" value={`¥${amount.toLocaleString()}`} highlight />
          <Row label="占总仓位" value={`${positionPct.toFixed(1)}%`}
            highlight={positionPct <= 25} />
          {positionPct > 25 && (
              <p className="text-xs mt-2 flex items-center gap-1" style={{ color: "var(--brand-warning)" }}>
                <AlertTriangle size={12} /> 该仓位超过 25%，建议调高止损价或降低最大亏损比例
              </p>
          )}
        </div>
      ) : (
        <div className="rounded-xl py-8 text-center" style={{ backgroundColor: "var(--surface-overlay)", borderRadius: 12 }}>
          <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
            填写买入价和止损价后显示结果（止损价须低于买入价）
          </p>
        </div>
      )}
    </div>
  );
}
