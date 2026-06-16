"use client";

import { useState } from "react";

type Payload = {
  tradeDate: string;
  limitUpCount: number | null;
  limitDownCount: number | null;
  sealRate: number | null;
  maxConsecBoards: number | null;
  turnoverYi: number | null;
  prevLimitPremium: number | null;
};

type Props = {
  defaultDate: string;
  submitting: boolean;
  onSubmit: (p: Payload) => void;
};

function parseNum(v: string): number | null {
  if (v.trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function MetricsForm({ defaultDate, submitting, onSubmit }: Props) {
  const [tradeDate, setTradeDate] = useState(defaultDate);
  const [limitUp, setLimitUp] = useState("");
  const [limitDown, setLimitDown] = useState("");
  const [sealRatePct, setSealRatePct] = useState("");
  const [maxBoards, setMaxBoards] = useState("");
  const [turnover, setTurnover] = useState("");
  const [premium, setPremium] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const sealRatePctNum = parseNum(sealRatePct);
    const sealRate = sealRatePctNum != null ? sealRatePctNum / 100 : null;
    onSubmit({
      tradeDate,
      limitUpCount: parseNum(limitUp),
      limitDownCount: parseNum(limitDown),
      sealRate,
      maxConsecBoards: parseNum(maxBoards),
      turnoverYi: parseNum(turnover),
      prevLimitPremium: parseNum(premium),
    });
  }

  const fields: { label: string; value: string; setter: (v: string) => void; placeholder: string; required?: boolean }[] = [
    { label: "涨停家数 *", value: limitUp, setter: setLimitUp, placeholder: "例如 65", required: true },
    { label: "封板率 %", value: sealRatePct, setter: setSealRatePct, placeholder: "0~100" },
    { label: "最高连板 *", value: maxBoards, setter: setMaxBoards, placeholder: "例如 4", required: true },
    { label: "跌停家数", value: limitDown, setter: setLimitDown, placeholder: "可空" },
    { label: "成交额（亿）", value: turnover, setter: setTurnover, placeholder: "可空" },
    { label: "昨涨停溢价 %", value: premium, setter: setPremium, placeholder: "可空，可负" },
  ];

  return (
    <form
      onSubmit={handleSubmit}
      className="card-surface rounded-xl border p-4 md:p-5 space-y-3"
      style={{ borderColor: "var(--border-subtle)" }}
    >
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Field label="交易日期 *" >
          <input
            type="date"
            required
            value={tradeDate}
            onChange={(e) => setTradeDate(e.target.value)}
            className="w-full px-2.5 py-1.5 rounded-md border text-sm bg-transparent"
            style={{ borderColor: "var(--border-subtle)", color: "var(--foreground)" }}
          />
        </Field>
        {fields.map((f) => (
          <Field key={f.label} label={f.label}>
            <input
              type="number"
              inputMode="decimal"
              step="any"
              required={f.required}
              value={f.value}
              onChange={(e) => f.setter(e.target.value)}
              placeholder={f.placeholder}
              className="w-full px-2.5 py-1.5 rounded-md border text-sm bg-transparent"
              style={{ borderColor: "var(--border-subtle)", color: "var(--foreground)" }}
            />
          </Field>
        ))}
      </div>

      <div className="flex items-center justify-between pt-1">
        <p className="text-[11px]" style={{ color: "var(--muted-foreground)" }}>
          带 * 为必填，封板率/连板高度直接决定阶段判定。
        </p>
        <button
          type="submit"
          disabled={submitting}
          className="text-xs px-3 py-1.5 rounded-md font-medium transition-opacity disabled:opacity-50"
          style={{
            backgroundColor: "var(--brand-blue)",
            color: "#fff",
          }}
        >
          {submitting ? "提交中…" : "保存并重算阶段"}
        </button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span
        className="block text-[11px] mb-1"
        style={{ color: "var(--muted-foreground)" }}
      >
        {label}
      </span>
      {children}
    </label>
  );
}
