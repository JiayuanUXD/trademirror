import { ShieldCheck, AlertOctagon, ArrowRight } from "lucide-react";
import Link from "next/link";
import type { GuardrailIdentitySnapshot, GuardrailEventType } from "@/lib/db/queries/guardrails";

const TYPE_LABEL: Record<GuardrailEventType, string> = {
  ADD_TO_LOSS: "向下补亏损",
  OVER_SINGLE_POS: "单票超仓",
  OVER_TOTAL_POS: "总仓位破阶段上限",
  OVER_DAILY_COUNT: "当日开仓过多",
  MISSING_STOP: "未填止损",
};

export function GuardrailIdentityCard({ snapshot }: { snapshot: GuardrailIdentitySnapshot }) {
  const {
    monthLabel,
    totalThisMonth,
    blockedThisMonth,
    overriddenThisMonth,
    totalOverridden,
    overriddenLossRate,
    overriddenAvgReturn,
    topType,
  } = snapshot;

  // 空状态：从未触发过任何护栏
  if (totalThisMonth === 0 && totalOverridden === 0) {
    return (
      <div
        className="rounded-xl border p-4"
        style={{
          backgroundColor: "var(--surface-card)",
          borderColor: "var(--border-subtle)",
        }}
      >
        <div className="flex items-center gap-2 mb-1">
          <ShieldCheck size={14} style={{ color: "var(--brand-green)" }} />
          <span className="text-xs font-medium" style={{ color: "var(--muted-foreground)" }}>
            护栏身份 · {monthLabel}
          </span>
        </div>
        <p className="text-sm" style={{ color: "var(--foreground)" }}>
          本月还没触发过护栏。开仓时若违反纪律，系统会替你拦一下。
        </p>
      </div>
    );
  }

  // 覆写后表现差是最强的提示信号 —— 用红色强调
  const overrideHurts = overriddenLossRate != null && overriddenLossRate >= 60;

  return (
    <div
      className="rounded-xl border p-4 space-y-3"
      style={{
        backgroundColor: "var(--surface-card)",
        borderColor: overrideHurts ? "var(--brand-red)" : "var(--border-subtle)",
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck size={14} style={{ color: "var(--brand-blue)" }} />
          <span className="text-xs font-medium" style={{ color: "var(--muted-foreground)" }}>
            护栏身份 · {monthLabel}
          </span>
        </div>
        <Link
          href="/decisions"
          className="text-[11px] inline-flex items-center gap-0.5"
          style={{ color: "var(--muted-foreground)" }}
        >
          查看记录 <ArrowRight size={11} />
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Cell label="拦截" value={blockedThisMonth} accent="ok" />
        <Cell label="覆写" value={overriddenThisMonth} accent={overriddenThisMonth > 0 ? "warn" : "muted"} />
        <Cell label="累计覆写" value={totalOverridden} accent="muted" small />
      </div>

      {topType && (
        <div className="flex items-center gap-2 text-xs">
          <span style={{ color: "var(--muted-foreground)" }}>本月最频繁：</span>
          <span style={{ color: "var(--foreground)" }}>
            {TYPE_LABEL[topType.type]} ({topType.count})
          </span>
        </div>
      )}

      {overriddenLossRate != null && overriddenAvgReturn != null && (
        <div
          className="rounded-lg p-3 text-xs flex items-start gap-2"
          style={{
            backgroundColor: overrideHurts ? "rgba(239, 68, 68, 0.08)" : "var(--surface-overlay)",
          }}
        >
          {overrideHurts ? (
            <AlertOctagon size={14} style={{ color: "var(--brand-red)" }} className="mt-0.5 shrink-0" />
          ) : (
            <ShieldCheck size={14} style={{ color: "var(--muted-foreground)" }} className="mt-0.5 shrink-0" />
          )}
          <div>
            <p style={{ color: overrideHurts ? "var(--brand-red)" : "var(--foreground)" }}>
              覆写后 30 日表现：亏损率 {overriddenLossRate.toFixed(0)}% · 均收益{" "}
              {overriddenAvgReturn > 0 ? "+" : ""}
              {overriddenAvgReturn.toFixed(1)}%
            </p>
            <p className="mt-0.5" style={{ color: "var(--muted-foreground)" }}>
              {overrideHurts
                ? "数据显示：你覆写护栏后多数会亏。下次拦截弹出时认真考虑放弃这笔。"
                : "覆写后表现还可以，继续保持纪律的同时，覆写是经过判断的。"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function Cell({
  label,
  value,
  accent,
  small,
}: {
  label: string;
  value: number;
  accent: "ok" | "warn" | "muted";
  small?: boolean;
}) {
  const color =
    accent === "warn"
      ? "var(--brand-warning)"
      : accent === "ok"
        ? "var(--brand-blue)"
        : "var(--foreground)";
  return (
    <div>
      <p className="text-[11px]" style={{ color: "var(--muted-foreground)" }}>
        {label}
      </p>
      <p
        className={`font-semibold tabular-nums ${small ? "text-base" : "text-xl"}`}
        style={{ color }}
      >
        {value}
      </p>
    </div>
  );
}
