"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lightbulb, CheckCircle } from "lucide-react";
import { StepIndicator } from "./step-indicator";
import { ScorePicker } from "./score-picker";
import { DangerDialog } from "./danger-dialog";
import type { DangerAlert } from "@/app/api/decisions/pre-check/route";
import { step1Schema, step2Schema, step3Schema } from "@/lib/validators/decision";
import {
  RATIONAL_BASIS,
  IRRATIONAL_BASIS,
  ACTION_LABELS,
  ALIGNMENT_LABELS,
  type DecisionAction,
  type DecisionBasis,
  type SystemAlignment,
} from "@/types/decision";

type Step1State = {
  stockCode: string;
  stockName: string;
  stockMarket: "SH" | "SZ" | "BJ";
  action: DecisionAction;
  price: string;
  quantity: string;
  reason: string;
};

type Step2State = {
  basis: DecisionBasis[];
  calmScore: number;
  confidenceScore: number;
  fomoScore: number;
};

type Step3State = {
  stopLossPrice: string;
  systemAlignment: SystemAlignment;
};

const STEP_LABELS = ["基础信息", "决策&情绪", "风险控制"];

const MARKET_OPTIONS: { value: "SH" | "SZ" | "BJ"; label: string }[] = [
  { value: "SH", label: "沪" },
  { value: "SZ", label: "深" },
  { value: "BJ", label: "北" },
];

export function DecisionForm() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingAlerts, setPendingAlerts] = useState<DangerAlert[] | null>(null);
  const [watchlistBanner, setWatchlistBanner] = useState(false);

  const [s1, setS1] = useState<Step1State>({
    stockCode: "",
    stockName: "",
    stockMarket: "SH",
    action: "BUY",
    price: "",
    quantity: "",
    reason: "",
  });

  const [s2, setS2] = useState<Step2State>({
    basis: [],
    calmScore: 5,
    confidenceScore: 5,
    fomoScore: 3,
  });

  const [s3, setS3] = useState<Step3State>({
    stopLossPrice: "",
    systemAlignment: "ALIGN",
  });

  function clearError(key: string) {
    setErrors((e) => {
      const next = { ...e };
      delete next[key];
      return next;
    });
  }

  function validateStep1(): boolean {
    const result = step1Schema.safeParse({
      ...s1,
      price: Number(s1.price),
      quantity: Number(s1.quantity),
    });
    if (!result.success) {
      const errs: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as string;
        if (!errs[key]) errs[key] = issue.message;
      }
      setErrors(errs);
      return false;
    }
    setErrors({});
    return true;
  }

  function validateStep2(): boolean {
    const result = step2Schema.safeParse(s2);
    if (!result.success) {
      const errs: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as string;
        if (!errs[key]) errs[key] = issue.message;
      }
      setErrors(errs);
      return false;
    }
    setErrors({});
    return true;
  }

  async function attemptSubmit() {
    const result = step3Schema.safeParse({
      stopLossPrice: Number(s3.stopLossPrice),
      systemAlignment: s3.systemAlignment,
    });
    if (!result.success) {
      const errs: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as string;
        if (!errs[key]) errs[key] = issue.message;
      }
      setErrors(errs);
      return;
    }
    setErrors({});

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/decisions/pre-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fomoScore: s2.fomoScore,
          calmScore: s2.calmScore,
          systemAlignment: s3.systemAlignment,
        }),
      });
      // 拦截失败不应阻断用户提交，仅记录后继续
      if (!res.ok) {
        console.warn("[pre-check] failed, proceeding without intercept");
        await actuallySubmit();
        return;
      }
      const data = (await res.json()) as { alerts: DangerAlert[] };
      if (data.alerts.length === 0) {
        await actuallySubmit();
      } else {
        setPendingAlerts(data.alerts);
        setIsSubmitting(false);
      }
    } catch (err) {
      console.warn("[pre-check] error, proceeding without intercept", err);
      await actuallySubmit();
    }
  }

  async function actuallySubmit() {
    setIsSubmitting(true);
    try {
      const payload = {
        stockCode: s1.stockCode,
        stockName: s1.stockName,
        stockMarket: s1.stockMarket,
        action: s1.action,
        price: Number(s1.price),
        quantity: Number(s1.quantity),
        reason: s1.reason,
        basis: s2.basis,
        calmScore: s2.calmScore,
        confidenceScore: s2.confidenceScore,
        fomoScore: s2.fomoScore,
        stopLossPrice: Number(s3.stopLossPrice),
        systemAlignment: s3.systemAlignment,
      };

      const res = await fetch("/api/decisions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error ?? "提交失败");
      }

      router.push("/decisions");
      router.refresh();
    } catch (err) {
      setErrors({ submit: err instanceof Error ? err.message : "提交失败，请重试" });
      setPendingAlerts(null);
    } finally {
      setIsSubmitting(false);
    }
  }

  const price = Number(s1.price) || 0;
  const quantity = Number(s1.quantity) || 0;
  const amount = price * quantity;
  const stopLoss = Number(s3.stopLossPrice) || 0;
  const maxLoss = Math.abs(price - stopLoss) * quantity;

  function toggleBasis(b: DecisionBasis) {
    setS2((prev) => ({
      ...prev,
      basis: prev.basis.includes(b)
        ? prev.basis.filter((x) => x !== b)
        : [...prev.basis, b],
    }));
    clearError("basis");
  }

  return (
    <div className="space-y-6">
      {/* 观察清单提示 banner */}
      {watchlistBanner && (
        <div
          className="rounded-xl px-4 py-3 flex items-start gap-2.5 text-sm"
          style={{
            backgroundColor: "rgba(61,142,248,0.08)",
            border: "1px solid rgba(61,142,248,0.25)",
            color: "var(--brand-blue)",
          }}
        >
          <span className="mt-0.5"><Lightbulb size={16} /></span>
          <div>
            <p className="font-medium text-sm">操作已暂缓</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>
              当前心态不稳，建议明日开盘前 9:30 再冷静判断这笔操作。表单数据已保留。
            </p>
          </div>
        </div>
      )}

      {/* Step indicator */}
      <div className="flex justify-center">
        <StepIndicator steps={STEP_LABELS} current={step} />
      </div>

      {/* ── Step 1 ── */}
      {step === 0 && (
        <div className="space-y-4">
          {/* Stock + market */}
          <div className="grid grid-cols-[1fr_auto_auto] gap-2">
            <div className="space-y-1">
              <label className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                股票代码
              </label>
              <input
                className="w-full h-9 px-3 rounded-md text-sm border"
                style={{
                  backgroundColor: "var(--surface-overlay)",
                  borderColor: errors.stockCode ? "var(--brand-red)" : "var(--border-subtle)",
                  color: "var(--foreground)",
                }}
                placeholder="600519"
                maxLength={6}
                value={s1.stockCode}
                onChange={(e) => {
                  setS1((p) => ({ ...p, stockCode: e.target.value }));
                  clearError("stockCode");
                }}
              />
              {errors.stockCode && (
                <p className="text-[11px]" style={{ color: "var(--brand-red)" }}>{errors.stockCode}</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                市场
              </label>
              <div className="flex gap-1">
                {MARKET_OPTIONS.map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setS1((p) => ({ ...p, stockMarket: m.value }))}
                    className="h-9 w-9 rounded-md text-xs font-medium transition-colors"
                    style={{
                      backgroundColor:
                        s1.stockMarket === m.value
                          ? "var(--brand-blue)"
                          : "var(--surface-overlay)",
                      color:
                        s1.stockMarket === m.value ? "#fff" : "var(--muted-foreground)",
                      border: `1px solid ${s1.stockMarket === m.value ? "var(--brand-blue)" : "var(--border-subtle)"}`,
                    }}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Stock name */}
          <div className="space-y-1">
            <label className="text-xs" style={{ color: "var(--muted-foreground)" }}>
              股票名称
            </label>
            <input
              className="w-full h-9 px-3 rounded-md text-sm border"
              style={{
                backgroundColor: "var(--surface-overlay)",
                borderColor: errors.stockName ? "var(--brand-red)" : "var(--border-subtle)",
                color: "var(--foreground)",
              }}
              placeholder="贵州茅台"
              value={s1.stockName}
              onChange={(e) => {
                setS1((p) => ({ ...p, stockName: e.target.value }));
                clearError("stockName");
              }}
            />
            {errors.stockName && (
              <p className="text-[11px]" style={{ color: "var(--brand-red)" }}>{errors.stockName}</p>
            )}
          </div>

          {/* Action */}
          <div className="space-y-1">
            <label className="text-xs" style={{ color: "var(--muted-foreground)" }}>
              操作方向
            </label>
            <div className="flex gap-2">
              {(Object.keys(ACTION_LABELS) as DecisionAction[]).map((a) => {
                const isActive = s1.action === a;
                const isBuy = a === "BUY" || a === "ADD";
                const isSell = a === "SELL" || a === "REDUCE" || a === "CLEAR";
                const activeColor = isBuy
                  ? "var(--brand-red)"
                  : isSell
                  ? "var(--brand-green)"
                  : "var(--brand-blue)";
                return (
                  <button
                    key={a}
                    type="button"
                    onClick={() => setS1((p) => ({ ...p, action: a }))}
                    className="flex-1 h-9 rounded-md text-xs font-medium transition-colors"
                    style={{
                      backgroundColor: isActive ? activeColor : "var(--surface-overlay)",
                      color: isActive ? "#fff" : "var(--muted-foreground)",
                      border: `1px solid ${isActive ? activeColor : "var(--border-subtle)"}`,
                    }}
                  >
                    {ACTION_LABELS[a]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Price + Quantity */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                价格（元）
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="w-full h-9 px-3 rounded-md text-sm border"
                style={{
                  backgroundColor: "var(--surface-overlay)",
                  borderColor: errors.price ? "var(--brand-red)" : "var(--border-subtle)",
                  color: "var(--foreground)",
                }}
                placeholder="1800.00"
                value={s1.price}
                onChange={(e) => {
                  setS1((p) => ({ ...p, price: e.target.value }));
                  clearError("price");
                }}
              />
              {errors.price && (
                <p className="text-[11px]" style={{ color: "var(--brand-red)" }}>{errors.price}</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                数量（股）
              </label>
              <input
                type="number"
                min="100"
                step="100"
                className="w-full h-9 px-3 rounded-md text-sm border"
                style={{
                  backgroundColor: "var(--surface-overlay)",
                  borderColor: errors.quantity ? "var(--brand-red)" : "var(--border-subtle)",
                  color: "var(--foreground)",
                }}
                placeholder="100"
                value={s1.quantity}
                onChange={(e) => {
                  setS1((p) => ({ ...p, quantity: e.target.value }));
                  clearError("quantity");
                }}
              />
              {errors.quantity && (
                <p className="text-[11px]" style={{ color: "var(--brand-red)" }}>{errors.quantity}</p>
              )}
            </div>
          </div>

          {/* Amount preview */}
          {amount > 0 && (
            <div
              className="text-right text-sm"
              style={{ color: "var(--muted-foreground)" }}
            >
              预计金额：
              <span style={{ color: "var(--foreground)", fontWeight: 600 }}>
                ¥{amount.toLocaleString("zh-CN", { maximumFractionDigits: 2 })}
              </span>
            </div>
          )}

          {/* Reason */}
          <div className="space-y-1">
            <div className="flex justify-between">
              <label className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                一句话理由
              </label>
              <span className="text-xs" style={{ color: s1.reason.length > 28 ? "var(--brand-red)" : "var(--muted-foreground)" }}>
                {s1.reason.length}/30
              </span>
            </div>
            <input
              className="w-full h-9 px-3 rounded-md text-sm border"
              style={{
                backgroundColor: "var(--surface-overlay)",
                borderColor: errors.reason ? "var(--brand-red)" : "var(--border-subtle)",
                color: "var(--foreground)",
              }}
              placeholder="估值低于历史均值，基本面无变化"
              maxLength={30}
              value={s1.reason}
              onChange={(e) => {
                setS1((p) => ({ ...p, reason: e.target.value }));
                clearError("reason");
              }}
            />
            {errors.reason && (
              <p className="text-[11px]" style={{ color: "var(--brand-red)" }}>{errors.reason}</p>
            )}
          </div>
        </div>
      )}

      {/* ── Step 2 ── */}
      {step === 1 && (
        <div className="space-y-5">
          {/* Decision basis */}
          <div className="space-y-2">
            <label className="text-xs" style={{ color: "var(--muted-foreground)" }}>
              决策依据（可多选）
            </label>

            <p className="text-[11px]" style={{ color: "var(--brand-green)" }}>
              理性依据
            </p>
            <div className="flex flex-wrap gap-2">
              {RATIONAL_BASIS.map((b) => {
                const isActive = s2.basis.includes(b);
                return (
                  <button
                    key={b}
                    type="button"
                    onClick={() => toggleBasis(b)}
                    className="px-3 py-1.5 rounded-full text-xs transition-colors"
                    style={{
                      backgroundColor: isActive
                        ? "rgba(34,197,94,0.15)"
                        : "var(--surface-overlay)",
                      color: isActive ? "var(--brand-green)" : "var(--muted-foreground)",
                      border: `1px solid ${isActive ? "var(--brand-green)" : "var(--border-subtle)"}`,
                    }}
                  >
                    {b}
                  </button>
                );
              })}
            </div>

            <p className="text-[11px] mt-2" style={{ color: "var(--brand-red)" }}>
              非理性依据
            </p>
            <div className="flex flex-wrap gap-2">
              {IRRATIONAL_BASIS.map((b) => {
                const isActive = s2.basis.includes(b);
                return (
                  <button
                    key={b}
                    type="button"
                    onClick={() => toggleBasis(b)}
                    className="px-3 py-1.5 rounded-full text-xs transition-colors"
                    style={{
                      backgroundColor: isActive
                        ? "rgba(239,68,68,0.15)"
                        : "var(--surface-overlay)",
                      color: isActive ? "var(--brand-red)" : "var(--muted-foreground)",
                      border: `1px solid ${isActive ? "var(--brand-red)" : "var(--border-subtle)"}`,
                    }}
                  >
                    {b}
                  </button>
                );
              })}
            </div>
            {errors.basis && (
              <p className="text-[11px]" style={{ color: "var(--brand-red)" }}>{errors.basis}</p>
            )}
          </div>

          {/* Emotion scores */}
          <ScorePicker
            label="平静度"
            subLabel="现在内心平静吗？"
            value={s2.calmScore}
            onChange={(v) => setS2((p) => ({ ...p, calmScore: v }))}
            lowLabel="焦虑"
            highLabel="平静"
          />
          <ScorePicker
            label="信心度"
            subLabel="对这笔交易有多确定？"
            value={s2.confidenceScore}
            onChange={(v) => setS2((p) => ({ ...p, confidenceScore: v }))}
            lowLabel="不确定"
            highLabel="很确定"
          />
          <ScorePicker
            label="FOMO 程度"
            subLabel="怕错过的程度？"
            value={s2.fomoScore}
            onChange={(v) => setS2((p) => ({ ...p, fomoScore: v }))}
            lowLabel="无"
            highLabel="强烈"
          />
        </div>
      )}

      {/* ── Step 3 ── */}
      {step === 2 && (
        <div className="space-y-4">
          {/* Stop loss */}
          <div className="space-y-1">
            <label className="text-xs" style={{ color: "var(--muted-foreground)" }}>
              预设止损价（元）
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              className="w-full h-9 px-3 rounded-md text-sm border"
              style={{
                backgroundColor: "var(--surface-overlay)",
                borderColor: errors.stopLossPrice ? "var(--brand-red)" : "var(--border-subtle)",
                color: "var(--foreground)",
              }}
              placeholder="1700.00"
              value={s3.stopLossPrice}
              onChange={(e) => {
                setS3((p) => ({ ...p, stopLossPrice: e.target.value }));
                clearError("stopLossPrice");
              }}
            />
            {errors.stopLossPrice && (
              <p className="text-[11px]" style={{ color: "var(--brand-red)" }}>{errors.stopLossPrice}</p>
            )}
          </div>

          {/* Max loss preview */}
          {maxLoss > 0 && (
            <div
              className="flex items-center justify-between rounded-md px-3 py-2 text-sm"
              style={{
                backgroundColor: "rgba(239,68,68,0.08)",
                border: "1px solid rgba(239,68,68,0.2)",
              }}
            >
              <span style={{ color: "var(--muted-foreground)" }}>最大可接受亏损</span>
              <span style={{ color: "var(--brand-red)", fontWeight: 600 }}>
                -¥{maxLoss.toLocaleString("zh-CN", { maximumFractionDigits: 0 })}
              </span>
            </div>
          )}

          {/* System alignment */}
          <div className="space-y-2">
            <label className="text-xs" style={{ color: "var(--muted-foreground)" }}>
              是否符合自己的交易体系？
            </label>
            <div className="flex gap-2">
              {(Object.keys(ALIGNMENT_LABELS) as SystemAlignment[]).map((a) => {
                const isActive = s3.systemAlignment === a;
                const colors: Record<SystemAlignment, { fg: string; bg: string }> = {
                  ALIGN: { fg: "var(--brand-green)", bg: "rgba(34,197,94,0.12)" },
                  PARTIAL: { fg: "var(--brand-warning)", bg: "rgba(245,158,11,0.12)" },
                  NOT_ALIGN: { fg: "var(--brand-red)", bg: "rgba(239,68,68,0.12)" },
                };
                const { fg, bg } = colors[a];
                return (
                  <button
                    key={a}
                    type="button"
                    onClick={() => setS3((p) => ({ ...p, systemAlignment: a }))}
                    className="flex-1 h-9 rounded-md text-xs font-medium transition-colors"
                    style={{
                      backgroundColor: isActive ? bg : "var(--surface-overlay)",
                      color: isActive ? fg : "var(--muted-foreground)",
                      border: `1px solid ${isActive ? fg : "var(--border-subtle)"}`,
                    }}
                  >
                    {ALIGNMENT_LABELS[a]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Submit error */}
          {errors.submit && (
            <p className="text-sm text-center" style={{ color: "var(--brand-red)" }}>
              {errors.submit}
            </p>
          )}
        </div>
      )}

      {/* Navigation buttons */}
      <div className="flex gap-3 pt-2">
        {step > 0 && (
          <button
            type="button"
            onClick={() => setStep((s) => s - 1)}
            className="flex-1 h-10 rounded-lg text-sm font-medium transition-colors"
            style={{
              backgroundColor: "var(--surface-overlay)",
              color: "var(--foreground)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            上一步
          </button>
        )}

        {step < 2 ? (
          <button
            type="button"
            onClick={() => {
              const ok = step === 0 ? validateStep1() : validateStep2();
              if (ok) setStep((s) => s + 1);
            }}
            className="flex-1 h-10 rounded-lg text-sm font-medium text-white transition-colors"
            style={{ backgroundColor: "var(--brand-blue)" }}
          >
            下一步
          </button>
        ) : (
          <button
            type="button"
            onClick={attemptSubmit}
            disabled={isSubmitting}
            className="flex-1 h-10 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50"
            style={{ backgroundColor: "var(--brand-blue)" }}
          >
            {isSubmitting ? "提交中…" : (
              <span className="flex items-center gap-1.5">
                <CheckCircle size={16} /> 记录这笔决策
              </span>
            )}
          </button>
        )}
      </div>

      <DangerDialog
        open={pendingAlerts !== null}
        alerts={pendingAlerts ?? []}
        isSubmitting={isSubmitting}
        onCancel={() => {
          if (isSubmitting) return;
          setPendingAlerts(null);
        }}
        onConfirm={() => {
          setPendingAlerts(null);
          void actuallySubmit();
        }}
        onWatchlist={() => {
          setPendingAlerts(null);
          setWatchlistBanner(true);
          // 滚到顶部让用户看到 banner
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
      />
    </div>
  );
}
