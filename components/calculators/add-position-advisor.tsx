"use client";

import { useState } from "react";
import { CheckCircle, XCircle, AlertTriangle } from "lucide-react";

type Verdict = "BUY" | "SKIP" | "WARN";

function getAdvice(params: {
  positionPct: number;
  costPrice: number;
  currentPrice: number;
  stopLoss: number;
  fundamentalGood: boolean | null;
  fundamentalChanged: boolean;
  totalCapital: number;
}): { verdict: Verdict; title: string; reasons: string[] } {
  const { positionPct, costPrice, currentPrice, stopLoss, fundamentalGood, fundamentalChanged, totalCapital } = params;
  const drawdown = costPrice > 0 ? ((currentPrice - costPrice) / costPrice) * 100 : 0;
  const reasons: string[] = [];

  // Hard stops
  if (fundamentalChanged && !fundamentalGood) {
    return {
      verdict: "SKIP",
      title: "不建议加仓 — 基本面恶化",
      reasons: [
        "基本面已经变差，这不是低吸，是越跌越补的陷阱",
        "持仓逻辑已经不成立，应考虑止损而非加仓",
        `当前亏损 ${Math.abs(drawdown).toFixed(1)}%，继续加仓会扩大风险敞口`,
      ],
    };
  }

  if (positionPct >= 25) {
    return {
      verdict: "SKIP",
      title: "不建议加仓 — 已超过单股仓位上限",
      reasons: [
        `当前该股仓位已达 ${positionPct}%，超过 25% 的纪律上限`,
        "集中持仓是散户亏损的主要原因之一",
        "如果想追加，请先评估是否需要减持其他标的",
      ],
    };
  }

  if (currentPrice <= stopLoss && stopLoss > 0) {
    return {
      verdict: "SKIP",
      title: "不建议加仓 — 价格已触及止损价",
      reasons: [
        `当前价 ¥${currentPrice} 已跌破你的止损价 ¥${stopLoss}`,
        "止损价是你之前冷静时设定的纪律，请执行",
        "加仓只会扩大损失",
      ],
    };
  }

  if (drawdown < -30) {
    return {
      verdict: "WARN",
      title: "谨慎加仓 — 跌幅过大",
      reasons: [
        `已跌 ${Math.abs(drawdown).toFixed(1)}%，跌幅超 30% 风险极高`,
        "这种跌幅通常意味着市场在用价格说明基本面问题",
        "除非你有非常强烈的基本面理由，否则建议等待企稳再操作",
      ],
    };
  }

  if (drawdown < -15 && !fundamentalGood) {
    return {
      verdict: "WARN",
      title: "谨慎加仓 — 跌幅较大且基本面不明",
      reasons: [
        `已跌 ${Math.abs(drawdown).toFixed(1)}%，基本面支撑不明确`,
        "在不确定基本面是否支持前加仓，成功率偏低",
        "建议先做基本面核查，再决定是否加仓",
      ],
    };
  }

  if (fundamentalGood && drawdown < 0 && drawdown > -20 && positionPct < 20) {
    return {
      verdict: "BUY",
      title: "可考虑加仓",
      reasons: [
        `基本面良好，当前仓位 ${positionPct}% 仍有加仓空间`,
        `跌幅 ${Math.abs(drawdown).toFixed(1)}% 属于正常回调范围`,
        "建议加仓后仓位不超过 25%",
        stopLoss > 0 ? `加仓后保持止损价 ¥${stopLoss}` : "加仓前设定明确止损价",
      ],
    };
  }

  return {
    verdict: "WARN",
    title: "建议观望",
    reasons: [
      "当前条件不够清晰，没有显著的加仓理由",
      "不加仓也是一种纪律",
      "等待更明确的方向后再操作",
    ],
  };
}

export function AddPositionAdvisor() {
  const [totalCapital, setTotalCapital] = useState("500000");
  const [positionPct, setPositionPct] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [currentPrice, setCurrentPrice] = useState("");
  const [stopLoss, setStopLoss] = useState("");
  const [fundamentalGood, setFundamentalGood] = useState<boolean | null>(null);
  const [fundamentalChanged, setFundamentalChanged] = useState(false);

  const tc = parseFloat(totalCapital) || 0;
  const pp = parseFloat(positionPct) || 0;
  const cp = parseFloat(costPrice) || 0;
  const cur = parseFloat(currentPrice) || 0;
  const sl = parseFloat(stopLoss) || 0;
  const drawdown = cp > 0 && cur > 0 ? ((cur - cp) / cp) * 100 : null;
  const valid = pp > 0 && cp > 0 && cur > 0;

  const advice = valid
    ? getAdvice({ positionPct: pp, costPrice: cp, currentPrice: cur, stopLoss: sl, fundamentalGood, fundamentalChanged, totalCapital: tc })
    : null;

  const verdictConfig = {
    BUY: { icon: <CheckCircle size={18} />, color: "var(--brand-green)", bg: "rgba(0,196,154,0.08)", border: "rgba(0,196,154,0.25)" },
    SKIP: { icon: <XCircle size={18} />, color: "var(--brand-red)", bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.25)" },
    WARN: { icon: <AlertTriangle size={18} />, color: "var(--brand-warning)", bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.25)" },
  };

  return (
    <div className="space-y-5">
      <p className="text-xs leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
        描述你的持仓情况，系统根据你的纪律规则给出加仓建议。
      </p>

      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "当前仓位（%）", value: positionPct, set: setPositionPct, ph: "15" },
          { label: "持仓成本价（元）", value: costPrice, set: setCostPrice, ph: "20.00" },
          { label: "当前价格（元）", value: currentPrice, set: setCurrentPrice, ph: "17.50" },
          { label: "预设止损价（元）", value: stopLoss, set: setStopLoss, ph: "16.00" },
        ].map(({ label, value, set, ph }) => (
          <div key={label}>
            <label className="block text-[11px] mb-1" style={{ color: "var(--muted-foreground)" }}>{label}</label>
            <input type="number" value={value} onChange={(e) => set(e.target.value)} placeholder={ph}
              className="w-full rounded-lg px-3 py-2 text-sm outline-none"
              style={{ backgroundColor: "var(--surface-overlay)", color: "var(--foreground)", border: "1px solid var(--border-subtle)" }} />
          </div>
        ))}
      </div>

      {drawdown !== null && (
        <div className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg"
          style={{ backgroundColor: "var(--surface-overlay)" }}>
          <span style={{ color: "var(--muted-foreground)" }}>持仓浮动：</span>
          <span className="font-semibold" style={{ color: drawdown >= 0 ? "var(--brand-green)" : "var(--brand-red)" }}>
            {drawdown >= 0 ? "+" : ""}{drawdown.toFixed(2)}%
          </span>
        </div>
      )}

      {/* Fundamental */}
      <div className="space-y-2">
        <p className="text-xs font-medium" style={{ color: "var(--foreground)" }}>基本面情况</p>
        <div className="flex gap-2">
          {(([
            { label: "基本面良好", value: true },
            { label: "基本面一般", value: null },
            { label: "基本面恶化", value: false },
          ]) as { label: string; value: boolean | null }[]).map(({ label, value }) => (
            <button key={label} type="button"
              onClick={() => { setFundamentalGood(value); setFundamentalChanged(value === false); }}
              className="flex-1 py-2 rounded-lg text-xs font-medium transition-colors"
              style={{
                backgroundColor: fundamentalGood === value
                  ? value === true ? "rgba(0,196,154,0.15)" : value === false ? "rgba(239,68,68,0.15)" : "rgba(245,158,11,0.15)"
                  : "var(--surface-overlay)",
                color: fundamentalGood === value
                  ? value === true ? "var(--brand-green)" : value === false ? "var(--brand-red)" : "var(--brand-warning)"
                  : "var(--muted-foreground)",
                border: `1px solid ${fundamentalGood === value ? "currentColor" : "var(--border-subtle)"}`,
              }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {valid && advice && (() => {
        const cfg = verdictConfig[advice.verdict];
        return (
          <div className="rounded-xl border p-4 space-y-3"
            style={{ backgroundColor: cfg.bg, borderColor: cfg.border }}>
            <div className="flex items-center gap-2" style={{ color: cfg.color }}>
              {cfg.icon}
              <span className="text-sm font-semibold">{advice.title}</span>
            </div>
            <ul className="space-y-1.5">
              {advice.reasons.map((r, i) => (
                <li key={i} className="flex items-start gap-2 text-xs" style={{ color: "var(--foreground)" }}>
                  <span className="shrink-0 mt-0.5 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cfg.color }} />
                  {r}
                </li>
              ))}
            </ul>
          </div>
        );
      })()}
    </div>
  );
}
