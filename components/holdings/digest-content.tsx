"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { TechnicalResult, SignalSummary } from "@/lib/technical/types";
import { summarize } from "@/lib/technical/signals";

type Props = {
  digestText: string;
  marketData: string;
  stockAnalyses: string;
};

type MarketIndex = { close: number; pctChg: number } | null;
type MarketMap = { sh: MarketIndex; sz: MarketIndex; cy: MarketIndex };

const RATING_LABEL = { bullish: "偏多", neutral: "中性", bearish: "偏空" } as const;
type Rating = keyof typeof RATING_LABEL;

// ─── 大盘条 ─────────────────────────────────────────────────────────────────

function MarketBar({ data }: { data: string }) {
  let market: MarketMap = { sh: null, sz: null, cy: null };
  try { market = JSON.parse(data); } catch { /* ignore */ }

  const items: { name: string; d: MarketIndex }[] = [
    { name: "上证指数", d: market.sh },
    { name: "深证成指", d: market.sz },
    { name: "创业板指", d: market.cy },
  ];

  return (
    <div
      className="rounded-xl border p-4 grid grid-cols-3 gap-3"
      style={{ backgroundColor: "var(--surface-card)", borderColor: "var(--border-subtle)" }}
    >
      {items.map(({ name, d }) => {
        if (!d) return <div key={name} className="text-center text-xs" style={{ color: "var(--muted-foreground)" }}>{name} --</div>;
        const up = d.pctChg >= 0;
        const color = up ? "var(--color-up)" : "var(--color-down)";
        return (
          <div key={name} className="text-center">
            <div className="text-[11px]" style={{ color: "var(--muted-foreground)" }}>{name}</div>
            <div className="text-base font-bold tabular-nums" style={{ color }}>{d.close.toFixed(2)}</div>
            <div
              className="mt-0.5 inline-flex items-center gap-0.5 text-xs font-medium tabular-nums px-1.5 py-0.5 rounded-full"
              style={{ color, backgroundColor: up ? "rgba(239,68,68,0.1)" : "rgba(34,197,94,0.1)" }}
            >
              {up ? "+" : ""}{d.pctChg.toFixed(2)}%
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── 个股卡片 ───────────────────────────────────────────────────────────────

function ratingColor(r: Rating) {
  switch (r) {
    case "bullish": return { text: "var(--color-up)", bg: "rgba(239,68,68,0.12)" };
    case "bearish": return { text: "var(--color-down)", bg: "rgba(34,197,94,0.12)" };
    default: return { text: "var(--muted-foreground)", bg: "rgba(148,163,184,0.12)" };
  }
}

function biasColor(b: "bullish" | "neutral" | "bearish") {
  switch (b) {
    case "bullish": return "var(--color-up)";
    case "bearish": return "var(--color-down)";
    default: return "var(--muted-foreground)";
  }
}

/** 迷你进度条 */
function MiniGauge({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.min(Math.max((value / max) * 100, 0), 100);
  return (
    <div className="h-1 rounded-full w-full" style={{ backgroundColor: "rgba(255,255,255,0.06)" }}>
      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  );
}

/** BOLL 位置可视化 */
function BollPosition({ boll }: { boll: TechnicalResult["boll"]; quote: TechnicalResult["quote"] }) {
  const posMap: Record<string, { label: string; pct: number }> = {
    above_upper: { label: "破上轨", pct: 95 },
    near_upper: { label: "近上轨", pct: 80 },
    middle: { label: "中轨附近", pct: 50 },
    near_lower: { label: "近下轨", pct: 20 },
    below_lower: { label: "破下轨", pct: 5 },
  };
  const pos = posMap[boll.position] ?? { label: "中轨", pct: 50 };
  const dotColor = pos.pct > 65 ? "var(--color-up)" : pos.pct < 35 ? "var(--color-down)" : "var(--muted-foreground)";

  return (
    <div className="flex items-center gap-2">
      <div className="relative h-1.5 rounded-full flex-1" style={{ backgroundColor: "rgba(255,255,255,0.06)" }}>
        {/* 上中下轨标记 */}
        <div className="absolute h-full w-px" style={{ left: "15%", backgroundColor: "rgba(34,197,94,0.3)" }} />
        <div className="absolute h-full w-px" style={{ left: "50%", backgroundColor: "rgba(148,163,184,0.3)" }} />
        <div className="absolute h-full w-px" style={{ left: "85%", backgroundColor: "rgba(239,68,68,0.3)" }} />
        {/* 价格位置 */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full border-2"
          style={{ left: `${pos.pct}%`, transform: `translate(-50%, -50%)`, borderColor: dotColor, backgroundColor: "var(--surface-card)" }}
        />
      </div>
      <span className="text-[10px] shrink-0 w-11 text-right" style={{ color: dotColor }}>{pos.label}</span>
    </div>
  );
}

function SignalChip({ label, bias }: { label: string; bias: "bullish" | "neutral" | "bearish" }) {
  const c = biasColor(bias);
  return (
    <span
      className="inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded"
      style={{ color: c, backgroundColor: bias === "bullish" ? "rgba(239,68,68,0.1)" : bias === "bearish" ? "rgba(34,197,94,0.1)" : "rgba(148,163,184,0.08)" }}
    >
      {label}
    </span>
  );
}

export function StockCard({ t, summary, narrativeHtml, footerHtml, embedded }: { t: TechnicalResult; summary: SignalSummary; narrativeHtml: string; footerHtml?: string; embedded?: boolean }) {
  const up = t.quote.pctChg >= 0;
  const priceColor = up ? "var(--color-up)" : "var(--color-down)";
  const rc = ratingColor(summary.rating);
  const [narrativeExpanded, setNarrativeExpanded] = useState(false);
  const [footerExpanded, setFooterExpanded] = useState(false);

  // 指标信号芯片
  const chips = summary.signals.map((s) => ({ label: s.category, bias: s.bias }));
  const bullCount = chips.filter(c => c.bias === "bullish").length;
  const bearCount = chips.filter(c => c.bias === "bearish").length;

  return (
    <div
      className={embedded ? "overflow-hidden" : "rounded-xl border overflow-hidden"}
      style={embedded ? {} : { backgroundColor: "var(--surface-card)", borderColor: "var(--border-subtle)" }}
    >
      {/* Header */}
      <div className="p-4 pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-sm font-bold truncate" style={{ color: "var(--foreground)" }}>{t.stockName}</span>
            <span className="text-[11px] tabular-nums" style={{ color: "var(--muted-foreground)" }}>{t.stockCode}</span>
          </div>
          <span
            className="shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full"
            style={{ color: rc.text, backgroundColor: rc.bg }}
          >
            {RATING_LABEL[summary.rating]}
          </span>
        </div>

        {/* 价格行 */}
        <div className="flex items-baseline gap-3 mt-1.5">
          <span className="text-xl font-bold tabular-nums" style={{ color: priceColor }}>{t.quote.close}</span>
          <span
            className="text-xs font-medium tabular-nums px-1.5 py-0.5 rounded"
            style={{ color: priceColor, backgroundColor: up ? "rgba(239,68,68,0.1)" : "rgba(34,197,94,0.1)" }}
          >
            {up ? "+" : ""}{t.quote.pctChg.toFixed(2)}%
          </span>
          {t.quote.turnoverRate !== null && (
            <span className="text-[11px] tabular-nums" style={{ color: "var(--muted-foreground)" }}>
              换手 {t.quote.turnoverRate.toFixed(1)}%
            </span>
          )}
        </div>

        {/* 四价横排 */}
        <div className="flex gap-3 mt-2 text-[11px] tabular-nums" style={{ color: "var(--muted-foreground)" }}>
          <span>开 {t.quote.open}</span>
          <span>高 <span style={{ color: "var(--color-up)" }}>{t.quote.high}</span></span>
          <span>低 <span style={{ color: "var(--color-down)" }}>{t.quote.low}</span></span>
          <span>量 {(t.volume.current / 10000).toFixed(0)}万</span>
        </div>
      </div>

      {/* 指标概览 */}
      <div className="px-4 pb-3">
        {/* 信号芯片 */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {chips.map((c) => <SignalChip key={c.label} label={c.label} bias={c.bias} />)}
          <span className="text-[10px] ml-1 self-center" style={{ color: "var(--muted-foreground)" }}>
            {bullCount > 0 && <span style={{ color: "var(--color-up)" }}>{bullCount}多</span>}
            {bullCount > 0 && bearCount > 0 && " "}
            {bearCount > 0 && <span style={{ color: "var(--color-down)" }}>{bearCount}空</span>}
          </span>
        </div>

        {/* 指标细节网格 */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
          {/* MACD */}
          <IndicatorRow
            label="MACD"
            bias={summary.signals.find(s => s.category === "MACD")?.bias ?? "neutral"}
            detail={macdDetail(t)}
          />
          {/* KDJ */}
          <IndicatorRow
            label="KDJ"
            bias={summary.signals.find(s => s.category === "KDJ")?.bias ?? "neutral"}
            detail={kdjDetail(t)}
          />
          {/* RSI */}
          <div className="col-span-2">
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span style={{ color: "var(--muted-foreground)" }}>RSI</span>
              <span className="tabular-nums" style={{ color: biasColor(summary.signals.find(s => s.category === "RSI")?.bias ?? "neutral") }}>
                {t.rsi.rsi6} / {t.rsi.rsi12} / {t.rsi.rsi24}
              </span>
            </div>
            <MiniGauge value={t.rsi.rsi6} max={100} color={t.rsi.rsi6 > 70 ? "var(--color-up)" : t.rsi.rsi6 < 30 ? "var(--color-down)" : "var(--brand-blue)"} />
          </div>
          {/* BOLL */}
          <div className="col-span-2">
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span style={{ color: "var(--muted-foreground)" }}>BOLL</span>
              <span className="tabular-nums text-[10px]" style={{ color: "var(--muted-foreground)" }}>
                {t.boll.lower} — {t.boll.middle} — {t.boll.upper}
              </span>
            </div>
            <BollPosition boll={t.boll} quote={t.quote} />
          </div>
          {/* 量能 */}
          <div className="col-span-2">
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span style={{ color: "var(--muted-foreground)" }}>量能</span>
              <span className="tabular-nums" style={{ color: biasColor(summary.signals.find(s => s.category === "量能")?.bias ?? "neutral") }}>
                {volumeLabel(t)}
              </span>
            </div>
            <MiniGauge
              value={t.volume.ratioVsMa5}
              max={3}
              color={t.volume.trend === "heavy" ? "var(--brand-blue)" : t.volume.trend === "light" ? "rgba(148,163,184,0.4)" : "var(--brand-blue)"}
            />
          </div>
          {/* 均线 */}
          <div className="col-span-2 flex items-center justify-between text-[11px]">
            <span style={{ color: "var(--muted-foreground)" }}>均线</span>
            <div className="flex items-center gap-1.5">
              <MADot label="5" value={t.ma.ma5} current={t.quote.close} />
              <MADot label="10" value={t.ma.ma10} current={t.quote.close} />
              <MADot label="20" value={t.ma.ma20} current={t.quote.close} />
              <MADot label="60" value={t.ma.ma60} current={t.quote.close} />
              <SignalChip
                label={t.ma.alignment === "bullish" ? "多头排列" : t.ma.alignment === "bearish" ? "空头排列" : "交织"}
                bias={t.ma.alignment === "bullish" ? "bullish" : t.ma.alignment === "bearish" ? "bearish" : "neutral"}
              />
            </div>
          </div>
        </div>
      </div>

      {/* AI 叙事 */}
      {narrativeHtml && (
        <>
          <div className="h-px" style={{ backgroundColor: "var(--border-subtle)" }} />
          <div className="px-4 py-3">
            <style>{digestStyles}</style>
            <div
              className={narrativeExpanded ? "" : "line-clamp-1"}
              dangerouslySetInnerHTML={{ __html: narrativeHtml }}
            />
            <button
              type="button"
              onClick={() => setNarrativeExpanded(!narrativeExpanded)}
              className="inline-flex items-center gap-0.5 text-[11px] mt-1 transition-colors hover:opacity-80"
              style={{ color: "var(--brand-blue)" }}
            >
              {narrativeExpanded ? "收起" : "展开"}
              {narrativeExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
          </div>
        </>
      )}

      {/* 明日关注（从 footer 拆分归属到本股） */}
      {footerHtml && (
        <>
          <div className="h-px" style={{ backgroundColor: "var(--border-subtle)" }} />
          <div className="px-4 py-3" style={{ backgroundColor: "var(--surface-overlay)" }}>
            <style>{digestStyles}</style>
            <div
              className={footerExpanded ? "" : "line-clamp-1"}
              dangerouslySetInnerHTML={{ __html: footerHtml }}
            />
            <button
              type="button"
              onClick={() => setFooterExpanded(!footerExpanded)}
              className="inline-flex items-center gap-0.5 text-[11px] mt-1 transition-colors hover:opacity-80"
              style={{ color: "var(--brand-blue)" }}
            >
              {footerExpanded ? "收起" : "展开"}
              {footerExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function IndicatorRow({ label, bias, detail }: { label: string; bias: "bullish" | "neutral" | "bearish"; detail: string }) {
  return (
    <div className="flex items-center justify-between text-[11px]">
      <span style={{ color: "var(--muted-foreground)" }}>{label}</span>
      <span className="tabular-nums font-medium" style={{ color: biasColor(bias) }}>{detail}</span>
    </div>
  );
}

function MADot({ label, value, current }: { label: string; value: number; current: number }) {
  if (!value) return null;
  const above = current >= value;
  return (
    <span
      className="text-[10px] tabular-nums"
      style={{ color: above ? "var(--color-up)" : "var(--color-down)" }}
    >
      {label}
    </span>
  );
}

// ─── 指标文字 helpers ───────────────────────────────────────────────────────

function macdDetail(t: TechnicalResult): string {
  const s = t.macd;
  const signal = s.signal === "golden_cross" ? "金叉" : s.signal === "death_cross" ? "死叉" : s.histogram > 0 ? "红柱" : "绿柱";
  return `${signal} ${s.dif.toFixed(2)}`;
}

function kdjDetail(t: TechnicalResult): string {
  const s = t.kdj;
  const signal = s.signal === "golden_cross" ? "金叉" : s.signal === "death_cross" ? "死叉" : s.signal === "overbought" ? "超买" : s.signal === "oversold" ? "超卖" : "";
  return `K${s.k} D${s.d} J${s.j}${signal ? " " + signal : ""}`;
}

function volumeLabel(t: TechnicalResult): string {
  const trend = t.volume.trend === "heavy" ? "放量" : t.volume.trend === "light" ? "缩量" : "平量";
  return `${trend} ${t.volume.ratioVsMa5}x`;
}

// ─── AI 文本渲染 ────────────────────────────────────────────────────────────

export const digestStyles = `
  .digest-h2 { font-size: 0.8125rem; font-weight: 700; margin: 0.75rem 0 0.375rem; color: var(--foreground); }
  .digest-h3 { font-size: 0.8125rem; font-weight: 600; margin: 0.75rem 0 0.375rem; color: var(--foreground); }
  .digest-p { font-size: 0.8125rem; line-height: 1.7; margin: 0.125rem 0; color: var(--foreground); }
  .digest-li { font-size: 0.8125rem; line-height: 1.7; margin-left: 1rem; list-style: disc; color: var(--foreground); }
  .digest-quote { font-size: 0.75rem; padding: 0.5rem 0.75rem; margin: 0.5rem 0; border-left: 3px solid var(--border-subtle); color: var(--muted-foreground); }
  .digest-bullish { color: var(--color-up); font-weight: 600; }
  .digest-bearish { color: var(--color-down); font-weight: 600; }
  .digest-up { color: var(--color-up); }
  .digest-down { color: var(--color-down); }
  .digest-golden { color: var(--color-up); font-weight: 600; }
  .digest-death { color: var(--color-down); font-weight: 600; }
  .digest-num-up { color: var(--color-up); font-variant-numeric: tabular-nums; }
  .digest-num-down { color: var(--color-down); font-variant-numeric: tabular-nums; }
`;

export function renderMarkdown(text: string): string {
  return text
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      if (trimmed.startsWith("## ")) return `<h3 class="digest-h3">${inlineMd(trimmed.slice(3))}</h3>`;
      if (trimmed.startsWith("# ")) return `<h2 class="digest-h2">${inlineMd(trimmed.slice(2))}</h2>`;
      if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) return `<li class="digest-li">${inlineMd(trimmed.slice(2))}</li>`;
      if (trimmed.startsWith("> ")) return `<blockquote class="digest-quote">${inlineMd(trimmed.slice(2))}</blockquote>`;
      if (!trimmed) return "";
      return `<p class="digest-p">${inlineMd(trimmed)}</p>`;
    })
    .join("");
}

function inlineMd(text: string): string {
  let r = text.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  // 评级关键词
  r = r.replace(/偏多/g, '<span class="digest-bullish">偏多</span>');
  r = r.replace(/偏空/g, '<span class="digest-bearish">偏空</span>');
  // 金叉/死叉
  r = r.replace(/金叉/g, '<span class="digest-golden">金叉</span>');
  r = r.replace(/死叉/g, '<span class="digest-death">死叉</span>');
  // 涨跌数字 +N% / -N%
  r = r.replace(/\+(\d+\.?\d*%)/g, '<span class="digest-num-up">+$1</span>');
  r = r.replace(/-(\d+\.?\d*%)/g, '<span class="digest-num-down">-$1</span>');
  // ▲▼
  r = r.replace(/▲([\d.]+%?)/g, '<span class="digest-up">▲$1</span>');
  r = r.replace(/▼([\d.]+%?)/g, '<span class="digest-down">▼$1</span>');
  return r;
}

/** 去除 AI 生成的套话前缀 */
const BOILERPLATE_PATTERNS = [
  /^好的[，,]?以下是.*?[。.]/,
  /^根据您?提供的.*?[。.]/,
  /^以下是.*?简报.*?[。.]/,
  /^---+$/,
  /^#{1,3}\s*盘后分析简报/,
  /^#{1,3}\s*简报/,
  /^\*{0,2}大盘环境总结[：:]\*{0,2}\s*/,
  /^\*{0,2}大盘环境[：:]\*{0,2}\s*/,
  /^\*{0,2}大盘总结[：:]\*{0,2}\s*/,
];

/** 去除个股叙事中的冗余子标题 */
const NARRATIVE_NOISE_PATTERNS = [
  /^#{1,3}\s*技术面解读[：:]?\s*/,
  /^#{1,3}\s*技术分析[：:]?\s*/,
  /^\*{0,2}技术面解读[：:]\*{0,2}\s*/,
  /^\*{0,2}技术分析[：:]\*{0,2}\s*/,
  /^技术面解读[：:]\s*/,
  /^技术分析[：:]\s*/,
];

function cleanLines(raw: string, patterns: RegExp[]): string {
  return raw
    .split("\n")
    .map((line) => {
      let t = line.trim();
      for (const p of patterns) {
        t = t.replace(p, "");
      }
      return t;
    })
    .filter((l) => l.length > 0)
    .join("\n");
}

/**
 * 按股票名从 AI 文本中切出对应段落，并将"明日关注"条目分配回各股
 */
export function splitDigestByStock(text: string, stockNames: string[]): {
  perStock: Map<string, string>;
  /** 每只股票的"明日关注"条目（已渲染 HTML） */
  perStockFooter: Map<string, string>;
  /** 开头的大盘总述（纯文本，未渲染） */
  summaryText: string;
  /** 无法归属到个股的尾部内容 */
  footer: string;
} {
  const perStock = new Map<string, string>();
  const perStockFooter = new Map<string, string>();
  let summaryText = "";
  let footerRaw = "";

  const lines = text.split("\n");
  const sections: { name: string | null; start: number; end: number }[] = [];
  let lastIdx = 0;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (trimmed.startsWith("## ") || trimmed.startsWith("# ")) {
      if (lastIdx < i) {
        sections.push({ name: null, start: lastIdx, end: i });
      }
      const matched = stockNames.find((n) => trimmed.includes(n));
      if (matched) {
        let end = lines.length;
        for (let j = i + 1; j < lines.length; j++) {
          if (lines[j].trim().startsWith("## ") || lines[j].trim().startsWith("# ")) {
            end = j;
            break;
          }
        }
        perStock.set(matched, renderMarkdown(cleanLines(lines.slice(i + 1, end).join("\n"), NARRATIVE_NOISE_PATTERNS)));
        sections.push({ name: matched, start: i, end });
        i = end - 1;
        lastIdx = end;
      } else if (trimmed.includes("关注") || trimmed.includes("总结") || trimmed.includes("要点")) {
        footerRaw = lines.slice(i + 1, lines.length).join("\n");
        lastIdx = lines.length;
        break;
      }
    }
  }

  // 开头未匹配段 = 大盘总述（去掉 AI 套话）
  if (sections.length > 0 && sections[0].name === null) {
    const rawSummary = lines.slice(sections[0].start, sections[0].end).join("\n");
    summaryText = cleanLines(rawSummary, BOILERPLATE_PATTERNS)
      .split("\n").map((l) => l.trim()).filter(Boolean).join(" ");
  } else if (sections.length === 0) {
    summaryText = cleanLines(text, BOILERPLATE_PATTERNS)
      .split("\n").map((l) => l.trim()).filter(Boolean).join(" ");
  }

  // 将 footer 中的列表项按股票名分配
  if (footerRaw) {
    const footerLines = footerRaw.split("\n");
    const unmatched: string[] = [];

    for (const fl of footerLines) {
      const t = fl.trim();
      if (!t) continue;
      const matchedName = stockNames.find((n) => t.includes(n));
      if (matchedName && (t.startsWith("- ") || t.startsWith("* ") || t.startsWith("·"))) {
        const existing = perStockFooter.get(matchedName) ?? "";
        perStockFooter.set(matchedName, existing + renderMarkdown(fl) );
      } else {
        unmatched.push(fl);
      }
    }

    const remainingText = unmatched.filter((l) => l.trim()).join("\n");
    if (remainingText) {
      // 剩余的无法归属内容
      // 尝试把无前缀但提到股票名的行也分配
    }
  }

  return { perStock, perStockFooter, summaryText, footer: "" };
}

// ─── 主组件 ─────────────────────────────────────────────────────────────────

export function DigestContent({ digestText, marketData, stockAnalyses }: Props) {
  const { analyses, summaries, split } = useMemo(() => {
    let parsed: TechnicalResult[] = [];
    try { parsed = JSON.parse(stockAnalyses) as TechnicalResult[]; } catch { /* ignore */ }

    const sums = parsed.map((a) => summarize(a));
    const names = parsed.map((a) => a.stockName);
    const sp = splitDigestByStock(digestText, names);

    return { analyses: parsed, summaries: sums, split: sp };
  }, [digestText, stockAnalyses]);

  // 没有结构化数据时回退纯文本
  if (analyses.length === 0) {
    const html = renderMarkdown(digestText);
    return (
      <div className="space-y-4">
        <MarketBar data={marketData} />
        <div
          className="rounded-xl border p-5"
          style={{ backgroundColor: "var(--surface-card)", borderColor: "var(--border-subtle)" }}
        >
          <style>{digestStyles}</style>
          <div dangerouslySetInnerHTML={{ __html: html }} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 大盘概况 + AI 一句话总述 */}
      <MarketBar data={marketData} />
      {split.summaryText && (
        <p className="text-xs leading-relaxed -mt-2 px-1" style={{ color: "var(--muted-foreground)" }}>
          {split.summaryText}
        </p>
      )}

      {/* 每只股票一张卡（含 AI 叙事 + 明日关注） */}
      {analyses.map((a, i) => (
        <StockCard
          key={a.stockCode}
          t={a}
          summary={summaries[i]}
          narrativeHtml={split.perStock.get(a.stockName) ?? ""}
          footerHtml={split.perStockFooter.get(a.stockName)}
        />
      ))}
    </div>
  );
}
