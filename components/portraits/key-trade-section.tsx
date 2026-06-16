"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, ExternalLink, X } from "lucide-react";
import type { KeyTradeCandidate, KeyTradeItem, KeyTradeKind } from "@/types/portrait";

type Props = {
  kind: KeyTradeKind;
  title: string;
  icon: React.ReactNode;
  accent: string;
  hint: string;
  candidates: KeyTradeCandidate[];
  item: KeyTradeItem | undefined;
  errorTypes: { id: string; name: string }[];
  locked: boolean;
  onChange: (item: KeyTradeItem | null) => void;
};

const ACTION_LABEL: Record<string, string> = {
  BUY: "买入",
  ADD: "加仓",
  SELL: "卖出",
  REDUCE: "减仓",
  CLEAR: "清仓",
};

function formatReturn(r: number | null): { text: string; color: string } {
  if (r == null) return { text: "—", color: "var(--muted-foreground)" };
  const sign = r > 0 ? "+" : "";
  const color = r > 0 ? "var(--color-up)" : r < 0 ? "var(--color-down)" : "var(--muted-foreground)";
  return { text: `${sign}${r.toFixed(1)}%`, color };
}

export function KeyTradeSection({
  title,
  icon,
  accent,
  hint,
  candidates,
  item,
  errorTypes,
  locked,
  onChange,
}: Props) {
  const [picking, setPicking] = useState(false);

  const selected = useMemo(
    () => candidates.find((c) => c.decisionId === item?.decisionId),
    [candidates, item?.decisionId]
  );

  const empty = candidates.length === 0;

  function pick(c: KeyTradeCandidate) {
    onChange({
      decisionId: c.decisionId,
      errorClassification: item?.decisionId === c.decisionId ? item.errorClassification : "",
      errorTypeId: item?.decisionId === c.decisionId ? item.errorTypeId ?? null : null,
      note: item?.decisionId === c.decisionId ? item.note : "",
    });
    setPicking(false);
  }

  function updateField(patch: Partial<KeyTradeItem>) {
    if (!item) return;
    onChange({ ...item, ...patch });
  }

  function clear() {
    onChange(null);
    setPicking(false);
  }

  return (
    <div
      className="rounded-lg border px-3 py-3 space-y-2"
      style={{ backgroundColor: "var(--surface-overlay)", borderColor: "var(--border-subtle)" }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-sm font-medium" style={{ color: accent }}>
          {icon} {title}
        </div>
        {item && !locked && (
          <button
            type="button"
            onClick={clear}
            className="text-[11px] px-1.5 py-0.5 rounded inline-flex items-center gap-0.5"
            style={{ color: "var(--muted-foreground)" }}
          >
            <X size={11} /> 清除
          </button>
        )}
      </div>
      <p className="text-[11px]" style={{ color: "var(--muted-foreground)" }}>{hint}</p>

      {empty && !item && (
        <p className="text-xs py-2 text-center" style={{ color: "var(--muted-foreground)" }}>
          本月没有匹配的候选笔
        </p>
      )}

      {!empty && !item && (
        <div className="space-y-1.5">
          <p className="text-[11px]" style={{ color: "var(--muted-foreground)" }}>
            系统候选（按规则排序，挑一笔确认）
          </p>
          {candidates.slice(0, 3).map((c) => (
            <CandidateChip key={c.decisionId} c={c} onPick={() => pick(c)} disabled={locked} />
          ))}
          {candidates.length > 3 && !picking && (
            <button
              type="button"
              onClick={() => setPicking(true)}
              className="text-[11px] inline-flex items-center gap-0.5"
              style={{ color: "var(--brand-blue)" }}
            >
              <ChevronDown size={11} /> 更多 {candidates.length - 3} 笔
            </button>
          )}
          {picking && candidates.slice(3).map((c) => (
            <CandidateChip key={c.decisionId} c={c} onPick={() => pick(c)} disabled={locked} />
          ))}
        </div>
      )}

      {item && selected && (
        <SelectedTrade
          c={selected}
          item={item}
          errorTypes={errorTypes}
          locked={locked}
          onChangeField={updateField}
        />
      )}

      {item && !selected && (
        <p className="text-[11px] py-2" style={{ color: "var(--brand-warning)" }}>
          已选笔不在候选范围内（可能跨月或被作废）。建议清除并重选。
        </p>
      )}
    </div>
  );
}

function CandidateChip({
  c,
  onPick,
  disabled,
}: {
  c: KeyTradeCandidate;
  onPick: () => void;
  disabled: boolean;
}) {
  const ret = formatReturn(c.return30Days);
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onPick}
      className="w-full flex items-center justify-between text-left px-2.5 py-1.5 rounded border text-xs disabled:cursor-default"
      style={{ borderColor: "var(--border-subtle)", backgroundColor: "var(--surface-card)" }}
    >
      <div className="flex items-center gap-1.5 min-w-0">
        <span
          className="px-1 py-px rounded text-[10px] font-medium"
          style={{ backgroundColor: "rgba(61,142,248,0.12)", color: "var(--brand-blue)" }}
        >
          {ACTION_LABEL[c.action] ?? c.action}
        </span>
        <span className="truncate" style={{ color: "var(--foreground)" }}>{c.stockName}</span>
        <span className="shrink-0" style={{ color: "var(--muted-foreground)" }}>
          {c.stockCode}
        </span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span style={{ color: "var(--muted-foreground)" }}>FOMO {c.fomoScore}</span>
        <span className="tabular-nums font-medium" style={{ color: ret.color }}>
          {ret.text}
        </span>
      </div>
    </button>
  );
}

function SelectedTrade({
  c,
  item,
  errorTypes,
  locked,
  onChangeField,
}: {
  c: KeyTradeCandidate;
  item: KeyTradeItem;
  errorTypes: { id: string; name: string }[];
  locked: boolean;
  onChangeField: (patch: Partial<KeyTradeItem>) => void;
}) {
  const ret = formatReturn(c.return30Days);
  return (
    <div className="space-y-2.5">
      <div
        className="flex items-center justify-between rounded px-2.5 py-1.5"
        style={{ backgroundColor: "var(--surface-card)", border: "1px solid var(--border-subtle)" }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="px-1 py-px rounded text-[10px] font-medium"
            style={{ backgroundColor: "rgba(61,142,248,0.12)", color: "var(--brand-blue)" }}
          >
            {ACTION_LABEL[c.action] ?? c.action}
          </span>
          <Link
            href={`/decisions/${c.decisionId}`}
            className="text-sm font-medium truncate inline-flex items-center gap-1"
            style={{ color: "var(--foreground)" }}
          >
            {c.stockName} <span style={{ color: "var(--muted-foreground)" }}>{c.stockCode}</span>
            <ExternalLink size={11} />
          </Link>
        </div>
        <span className="text-sm tabular-nums font-semibold shrink-0" style={{ color: ret.color }}>
          {ret.text}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={locked}
          onClick={() => onChangeField({ errorClassification: "NEW", errorTypeId: null })}
          className="px-2 py-1.5 rounded text-xs border text-left disabled:cursor-default"
          style={{
            backgroundColor: item.errorClassification === "NEW" ? "rgba(245,158,11,0.12)" : "transparent",
            borderColor: item.errorClassification === "NEW" ? "var(--brand-warning)" : "var(--border-subtle)",
            color: item.errorClassification === "NEW" ? "var(--brand-warning)" : "var(--muted-foreground)",
          }}
        >
          <div className="font-medium">新错误</div>
          <div className="text-[10px]">第一次犯，需归档</div>
        </button>
        <button
          type="button"
          disabled={locked}
          onClick={() => onChangeField({ errorClassification: "OLD" })}
          className="px-2 py-1.5 rounded text-xs border text-left disabled:cursor-default"
          style={{
            backgroundColor: item.errorClassification === "OLD" ? "rgba(248,68,68,0.12)" : "transparent",
            borderColor: item.errorClassification === "OLD" ? "var(--color-down)" : "var(--border-subtle)",
            color: item.errorClassification === "OLD" ? "var(--color-down)" : "var(--muted-foreground)",
          }}
        >
          <div className="font-medium">老错误</div>
          <div className="text-[10px]">历史问题再现</div>
        </button>
      </div>

      {item.errorClassification === "OLD" && (
        <select
          disabled={locked}
          value={item.errorTypeId ?? ""}
          onChange={(e) => onChangeField({ errorTypeId: e.target.value || null })}
          className="w-full px-2 py-1.5 rounded text-xs border"
          style={{
            backgroundColor: "var(--surface-card)",
            borderColor: "var(--border-subtle)",
            color: "var(--foreground)",
          }}
        >
          <option value="">关联到哪个老错误？</option>
          {errorTypes.map((et) => (
            <option key={et.id} value={et.id}>{et.name}</option>
          ))}
        </select>
      )}

      <textarea
        rows={2}
        maxLength={50}
        disabled={locked}
        placeholder="一句话说清楚——发生了什么、为什么。"
        value={item.note}
        onChange={(e) => onChangeField({ note: e.target.value })}
        className="w-full px-2 py-1.5 rounded text-xs border resize-none"
        style={{
          backgroundColor: "var(--surface-card)",
          borderColor: "var(--border-subtle)",
          color: "var(--foreground)",
        }}
      />
      <div className="flex justify-end">
        <span className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>
          {item.note.length}/50
        </span>
      </div>
    </div>
  );
}
