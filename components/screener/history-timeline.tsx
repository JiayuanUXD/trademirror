import dayjs from "dayjs";
import { History } from "lucide-react";
import type { SnapshotWithCandidates, ScreenerCandidateRow } from "@/lib/db/queries/screener";

const STAGE_LABEL: Record<string, string> = {
  ICE: "冰点",
  REPAIR: "修复",
  FERMENT: "发酵",
  MAIN_RISE: "主升",
  EBB: "退潮",
};

const STAGE_COLOR: Record<string, string> = {
  ICE: "var(--muted-foreground)",
  REPAIR: "var(--brand-blue)",
  FERMENT: "var(--brand-warning)",
  MAIN_RISE: "var(--color-up)",
  EBB: "var(--color-down)",
};

export function HistoryTimeline({ history }: { history: SnapshotWithCandidates[] }) {
  if (history.length <= 1) return null;
  const past = history.slice(1);

  return (
    <div
      className="card-surface rounded-xl border p-5 space-y-4"
      style={{ borderColor: "var(--border-subtle)" }}
    >
      <div className="flex items-center gap-2">
        <History size={14} style={{ color: "var(--muted-foreground)" }} />
        <h3
          className="text-xs font-medium uppercase tracking-wider"
          style={{ color: "var(--muted-foreground)" }}
        >
          历史时间轴
        </h3>
        <span className="text-[10px] ml-auto" style={{ color: "var(--muted-foreground)" }}>
          最近 {past.length} 次扫描
        </span>
      </div>

      <p className="text-xs -mt-1" style={{ color: "var(--muted-foreground)" }}>
        看看过去几天选了哪些、现在跑得怎么样。胜率自己心里也有数。
      </p>

      <div className="space-y-4">
        {past.map(({ snapshot, candidates }) => (
          <DayBlock
            key={snapshot.id}
            tradeDate={snapshot.tradeDate}
            stage={snapshot.stageAtRun}
            gateMaxSize={snapshot.gateMaxSize}
            candidates={candidates}
          />
        ))}
      </div>
    </div>
  );
}

function DayBlock({
  tradeDate,
  stage,
  gateMaxSize,
  candidates,
}: {
  tradeDate: string;
  stage: string;
  gateMaxSize: number;
  candidates: ScreenerCandidateRow[];
}) {
  const dateLabel = dayjs(tradeDate).format("MM/DD");
  const stageColor = STAGE_COLOR[stage] ?? "var(--foreground)";

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs">
        <span className="font-medium tabular-nums" style={{ color: "var(--foreground)" }}>
          {dateLabel}
        </span>
        <span
          className="px-1.5 py-0.5 rounded text-[10px] font-medium"
          style={{
            backgroundColor: `${stageColor}1f`,
            color: stageColor,
          }}
        >
          {STAGE_LABEL[stage] ?? stage}
        </span>
        <span style={{ color: "var(--muted-foreground)" }}>
          {gateMaxSize === 0 ? "暂停" : `闸门 ≤${gateMaxSize}`}
        </span>
        <span className="ml-auto" style={{ color: "var(--muted-foreground)" }}>
          {candidates.length} 只
        </span>
      </div>

      {candidates.length === 0 ? (
        <p className="text-xs pl-2" style={{ color: "var(--muted-foreground)" }}>
          闸门暂停，未入池。
        </p>
      ) : (
        <div className="space-y-1">
          {candidates.map((c) => (
            <CandidateLine key={c.id} c={c} />
          ))}
        </div>
      )}
    </div>
  );
}

function CandidateLine({ c }: { c: ScreenerCandidateRow }) {
  let tags: string[] = [];
  try {
    tags = JSON.parse(c.reasonTags);
  } catch {
    tags = [];
  }
  const headlineTag = tags.find((t) => t !== "流动性达标") ?? null;

  return (
    <div
      className="flex items-center gap-2 text-xs py-1 border-b last:border-b-0"
      style={{ borderColor: "var(--border-subtle)" }}
    >
      <span
        className="font-medium w-16 truncate shrink-0"
        style={{ color: "var(--foreground)" }}
      >
        {c.name}
      </span>
      <span className="tabular-nums w-12 shrink-0" style={{ color: "var(--muted-foreground)" }}>
        {c.symbol}
      </span>
      {headlineTag ? (
        <span
          className="px-1 py-0.5 rounded text-[10px] shrink-0"
          style={{
            backgroundColor: "rgba(245,158,11,0.12)",
            color: "var(--brand-warning)",
          }}
        >
          {headlineTag}
        </span>
      ) : (
        <span className="w-0 shrink-0" />
      )}
      <div className="ml-auto flex items-center gap-3 tabular-nums">
        <ReturnCell label="T1" v={c.retT1} />
        <ReturnCell label="T3" v={c.retT3} />
        <ReturnCell label="T5" v={c.retT5} />
      </div>
    </div>
  );
}

function ReturnCell({ label, v }: { label: string; v: number | null }) {
  if (v == null) {
    return (
      <span style={{ color: "var(--muted-foreground)" }}>
        {label} —
      </span>
    );
  }
  const color = v > 0 ? "var(--color-up)" : v < 0 ? "var(--color-down)" : "var(--foreground)";
  const sign = v > 0 ? "+" : "";
  return (
    <span style={{ color }}>
      {label} {sign}
      {v.toFixed(2)}%
    </span>
  );
}
