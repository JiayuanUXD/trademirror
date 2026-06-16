"use client";

import dayjs from "dayjs";
import type { StageHistoryRow } from "@/lib/db/queries/sentiment";
import { STAGE_LABEL, type SentimentStage } from "@/lib/sentiment/stage";

type Props = { history: StageHistoryRow[] };

const STAGE_COLOR: Record<SentimentStage, string> = {
  ICE: "var(--brand-blue)",
  REPAIR: "var(--muted-foreground)",
  FERMENT: "var(--brand-warning)",
  MAIN_RISE: "var(--color-up)",
  EBB: "var(--color-down)",
};

export function StageHistoryStrip({ history }: Props) {
  if (history.length === 0) {
    return null;
  }

  return (
    <div
      className="card-surface rounded-xl border p-4"
      style={{ borderColor: "var(--border-subtle)" }}
    >
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-xs font-semibold" style={{ color: "var(--foreground)" }}>
            阶段轮转（近 {history.length} 日）
          </h3>
          <p className="text-[10px] mt-0.5" style={{ color: "var(--muted-foreground)" }}>
            一眼看清最近的环境节奏，悬停查看每天的判定
          </p>
        </div>
        <Legend />
      </div>

      <div className="flex gap-[2px] overflow-x-auto pb-1">
        {history.map((row) => (
          <div
            key={row.tradeDate}
            className="flex-1 min-w-[10px] h-7 rounded-sm relative group cursor-default"
            style={{ backgroundColor: STAGE_COLOR[row.stage as SentimentStage] }}
            title={`${row.tradeDate} · ${STAGE_LABEL[row.stage as SentimentStage]} · 仓位上限 ${(
              row.positionCap * 100
            ).toFixed(0)}%`}
          >
            <div
              className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 rounded text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10"
              style={{
                backgroundColor: "var(--surface-overlay)",
                border: "1px solid var(--border-subtle)",
                color: "var(--foreground)",
              }}
            >
              {dayjs(row.tradeDate).format("MM-DD")} ·{" "}
              {STAGE_LABEL[row.stage as SentimentStage]} ·{" "}
              {(row.positionCap * 100).toFixed(0)}%
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-between mt-1 text-[10px]" style={{ color: "var(--muted-foreground)" }}>
        <span>{dayjs(history[0].tradeDate).format("MM-DD")}</span>
        <span>{dayjs(history[history.length - 1].tradeDate).format("MM-DD")}</span>
      </div>
    </div>
  );
}

function Legend() {
  const items: { stage: SentimentStage; label: string }[] = [
    { stage: "ICE", label: "冰点" },
    { stage: "REPAIR", label: "修复" },
    { stage: "FERMENT", label: "发酵" },
    { stage: "MAIN_RISE", label: "主升" },
    { stage: "EBB", label: "退潮" },
  ];
  return (
    <div className="flex flex-wrap items-center gap-2 justify-end">
      {items.map((it) => (
        <span
          key={it.stage}
          className="inline-flex items-center gap-1 text-[10px]"
          style={{ color: "var(--muted-foreground)" }}
        >
          <span
            className="inline-block w-2.5 h-2.5 rounded-sm"
            style={{ backgroundColor: STAGE_COLOR[it.stage] }}
          />
          {it.label}
        </span>
      ))}
    </div>
  );
}
