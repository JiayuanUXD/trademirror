"use client";

import type { GateStatus } from "@/lib/screener/funnel";
import { STAGE_LABEL, type SentimentStage } from "@/lib/sentiment/stage";

const STATUS_THEME: Record<GateStatus, { bg: string; fg: string; label: string; hint: string }> = {
  OPEN: {
    bg: "rgba(245, 158, 11, 0.14)",
    fg: "#F59E0B",
    label: "闸门开启",
    hint: "环境允许积极扫描，但仍要走完决策卡",
  },
  LIMITED: {
    bg: "rgba(96, 165, 250, 0.12)",
    fg: "#60A5FA",
    label: "闸门收紧",
    hint: "环境一般，候选数量已被压缩",
  },
  PAUSED: {
    bg: "rgba(34, 197, 94, 0.14)",
    fg: "#22C55E",
    label: "闸门暂停",
    hint: "退潮 / 冰点，建议今天什么都不做",
  },
};

export function GateBanner({
  stage,
  status,
  maxSize,
  poolSize,
  universeSize,
  tradeDate,
}: {
  stage: SentimentStage;
  status: GateStatus;
  maxSize: number;
  poolSize: number;
  universeSize: number;
  tradeDate: string;
}) {
  const theme = STATUS_THEME[status];
  return (
    <div
      className="rounded-xl border p-4 md:p-5"
      style={{
        backgroundColor: theme.bg,
        borderColor: theme.fg + "55",
      }}
    >
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <span
            className="text-xs font-semibold px-2 py-0.5 rounded"
            style={{ backgroundColor: theme.fg + "22", color: theme.fg }}
          >
            {STAGE_LABEL[stage]} · {theme.label}
          </span>
          <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
            {tradeDate} · 全市场 {universeSize.toLocaleString()} 只 → 入池 {poolSize}/{maxSize}
          </span>
        </div>
      </div>
      <p className="text-sm mt-2" style={{ color: "var(--foreground)" }}>
        {theme.hint}
      </p>
    </div>
  );
}
