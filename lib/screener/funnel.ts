// 选股漏斗 v1：第 0 层闸门 + 第 1 层流动性 + 第 2 层技术拒马 + 第 3 层突破信号
// 输入：阶段决策 + 用户设置 + 全市场行情
// 输出：snapshot 元数据 + 候选明细

import type { SentimentStage } from "@/lib/sentiment/stage";
import type { MarketRow } from "./eastmoney-clist";
import { fetchKLineBatch } from "./kline";
import { computeSignals } from "./indicators";

export type GateStatus = "OPEN" | "PAUSED" | "LIMITED";

const GATE_MAX_BY_STAGE: Record<SentimentStage, number> = {
  ICE: 3,
  EBB: 3,
  REPAIR: 5,
  FERMENT: 6,
  MAIN_RISE: 8,
};

const GATE_STATUS_BY_STAGE: Record<SentimentStage, GateStatus> = {
  ICE: "LIMITED",
  EBB: "LIMITED",
  REPAIR: "LIMITED",
  FERMENT: "OPEN",
  MAIN_RISE: "OPEN",
};

// 第 1 层后取这么多只送进第 2/3 层做日 K 体检（控制总耗时）
const TECHNICAL_PROBE_LIMIT = 60;

export function gateForStage(stage: SentimentStage): {
  status: GateStatus;
  maxSize: number;
} {
  return {
    status: GATE_STATUS_BY_STAGE[stage],
    maxSize: GATE_MAX_BY_STAGE[stage],
  };
}

export type FunnelSettings = {
  minTurnoverYi: number;
  minTurnoverRatePct: number;
  maxTurnoverRatePct: number;
  minPrice: number;
  maxPrice: number;
  excludeSt: boolean;
  excludeNew: boolean;
  maxPoolSize: number;
};

export type FunnelCandidate = {
  symbol: string;
  name: string;
  price: number;
  turnoverYi: number;
  turnoverRatePct: number;
  volumeRatio: number | null;
  amplitudePct: number | null;
  score: number;
  reasonTags: string[];
};

export type FilteredSummary = {
  universe: number;
  afterPriceRange: number;
  afterStFilter: number;
  afterNewFilter: number;
  afterTurnoverYi: number;
  afterTurnoverRate: number;
  afterTechnicalProbe: number;  // 进入日 K 体检的数量
  afterTrendFilter: number;     // 第 2 层后留下数量
  afterGate: number;
};

export type FunnelResult = {
  stage: SentimentStage;
  gateStatus: GateStatus;
  gateMaxSize: number;
  poolSize: number;
  universeSize: number;
  candidates: FunnelCandidate[];
  filteredSummary: FilteredSummary;
};

function isLikelyNew(name: string): boolean {
  return /^[NC]/.test(name);
}

function isSt(name: string): boolean {
  return name.includes("ST") || name.includes("退");
}

export async function runFunnel(args: {
  stage: SentimentStage;
  settings: FunnelSettings;
  marketRows: MarketRow[];
}): Promise<FunnelResult> {
  const { stage, settings, marketRows } = args;
  const gate = gateForStage(stage);

  const universe = marketRows.length;
  const summary: FilteredSummary = {
    universe,
    afterPriceRange: 0,
    afterStFilter: 0,
    afterNewFilter: 0,
    afterTurnoverYi: 0,
    afterTurnoverRate: 0,
    afterTechnicalProbe: 0,
    afterTrendFilter: 0,
    afterGate: 0,
  };

  let pool: MarketRow[] = marketRows;

  // ─── 第 1 层 · 流动性过滤 ─────────────────────────────────────────
  pool = pool.filter(
    (r) => r.price >= settings.minPrice && r.price <= settings.maxPrice
  );
  summary.afterPriceRange = pool.length;

  if (settings.excludeSt) pool = pool.filter((r) => !isSt(r.name));
  summary.afterStFilter = pool.length;

  if (settings.excludeNew) pool = pool.filter((r) => !isLikelyNew(r.name));
  summary.afterNewFilter = pool.length;

  pool = pool.filter((r) => r.turnoverYi >= settings.minTurnoverYi);
  summary.afterTurnoverYi = pool.length;

  pool = pool.filter(
    (r) =>
      r.turnoverRatePct >= settings.minTurnoverRatePct &&
      r.turnoverRatePct <= settings.maxTurnoverRatePct
  );
  summary.afterTurnoverRate = pool.length;

  // 按成交额降序，取 top N 送进日 K 体检
  pool.sort((a, b) => b.turnoverYi - a.turnoverYi);
  const probeTargets = pool.slice(0, TECHNICAL_PROBE_LIMIT);
  summary.afterTechnicalProbe = probeTargets.length;

  // ─── 第 2/3 层 · 日 K 体检 ────────────────────────────────────────
  const klineMap = await fetchKLineBatch(
    probeTargets.map((r) => ({ code: r.symbol, market: r.market })),
    30,
    8
  );

  type Probed = {
    row: MarketRow;
    score: number;
    reasonTags: string[];
    volRatio: number | null;
    survived: boolean;
  };

  const probed: Probed[] = probeTargets.map((row) => {
    const bars = klineMap.get(row.symbol);
    const tags: string[] = ["流动性达标"];
    let score = 0.5;
    let survived = true;
    let volRatio: number | null = row.volumeRatio;

    if (!bars || bars.length < 11) {
      // 数据不够，保留但不打突破标签
      return { row, score, reasonTags: tags, volRatio, survived };
    }

    const sig = computeSignals(bars);
    volRatio = sig.volRatio ?? volRatio;

    // 第 2 层 · 技术拒马：跌破 MA10 或 MA5 死叉 MA10 → 出局
    if (sig.belowMA10 || sig.deadCross) {
      survived = false;
      return { row, score, reasonTags: tags, volRatio, survived };
    }

    // 第 3 层 · 突破信号：放量 + 平台突破 / 创 20 日新高
    if (sig.volRatio != null && sig.volRatio >= 2) {
      tags.push("放量");
      score += 0.2;
    }
    if (sig.platformBreakout) {
      tags.push("平台突破");
      score += 0.3;
    }
    if (sig.breakout20) {
      tags.push("20日新高");
      score += 0.2;
    }

    return { row, score, reasonTags: tags, volRatio, survived };
  });

  const survivors = probed.filter((p) => p.survived);
  summary.afterTrendFilter = survivors.length;

  // 综合排序：score 降序 → 同分按成交额降序
  survivors.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.row.turnoverYi - a.row.turnoverYi;
  });

  const cap = Math.min(gate.maxSize, settings.maxPoolSize);
  const sliced = survivors.slice(0, cap);
  summary.afterGate = sliced.length;

  const candidates: FunnelCandidate[] = sliced.map((p) => ({
    symbol: p.row.symbol,
    name: p.row.name,
    price: p.row.price,
    turnoverYi: p.row.turnoverYi,
    turnoverRatePct: p.row.turnoverRatePct,
    volumeRatio: p.volRatio,
    amplitudePct: p.row.amplitudePct,
    score: Math.round(p.score * 100) / 100,
    reasonTags: p.reasonTags,
  }));

  return {
    stage,
    gateStatus: gate.status,
    gateMaxSize: gate.maxSize,
    poolSize: candidates.length,
    universeSize: universe,
    candidates,
    filteredSummary: summary,
  };
}
