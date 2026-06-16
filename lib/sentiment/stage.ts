// 情绪阶段映射规则引擎
// 输入：今日核心指标 + 昨日（用于判趋势方向）
// 输出：阶段 + 仓位上限 + 命中规则的快照

export type SentimentStage = "ICE" | "REPAIR" | "FERMENT" | "MAIN_RISE" | "EBB";

export const STAGE_LABEL: Record<SentimentStage, string> = {
  ICE: "冰点",
  REPAIR: "修复",
  FERMENT: "发酵",
  MAIN_RISE: "主升",
  EBB: "退潮",
};

export type SentimentMetrics = {
  limitUpCount: number | null;
  limitDownCount: number | null;
  sealRate: number | null;        // 0~1
  maxConsecBoards: number | null;
  turnoverYi: number | null;
  prevLimitPremium: number | null;
};

export type StageDecision = {
  stage: SentimentStage;
  positionCap: number;          // 0~1，1 表示放开到"个人最大值"
  triggers: string[];           // 命中该结论的关键规则文案
};

const POSITION_CAP: Record<SentimentStage, number> = {
  ICE: 0.20,
  REPAIR: 0.50,
  FERMENT: 0.80,
  MAIN_RISE: 1.00,
  EBB: 0.30,
};

export type StageCaps = Record<SentimentStage, number>;
export const DEFAULT_CAPS: StageCaps = POSITION_CAP;

export type StageThresholds = {
  mainRiseLimitUp: number;
  mainRiseSealRate: number;     // 0~1
  mainRiseMaxBoards: number;
  ebbLimitDown: number;
  iceLimitUp: number;
  iceMaxBoards: number;
  fermentLimitUp: number;
  fermentMaxBoards: number;
};

export const DEFAULT_THRESHOLDS: StageThresholds = {
  mainRiseLimitUp: 80,
  mainRiseSealRate: 0.7,
  mainRiseMaxBoards: 5,
  ebbLimitDown: 30,
  iceLimitUp: 30,
  iceMaxBoards: 2,
  fermentLimitUp: 50,
  fermentMaxBoards: 4,
};

export function capsFromSettings(s: {
  capIce: number;
  capRepair: number;
  capFerment: number;
  capMainRise: number;
  capEbb: number;
}): StageCaps {
  return {
    ICE: s.capIce,
    REPAIR: s.capRepair,
    FERMENT: s.capFerment,
    MAIN_RISE: s.capMainRise,
    EBB: s.capEbb,
  };
}

export function thresholdsFromSettings(s: {
  thrMainRiseLimitUp: number;
  thrMainRiseSealRate: number;
  thrMainRiseMaxBoards: number;
  thrEbbLimitDown: number;
  thrIceLimitUp: number;
  thrIceMaxBoards: number;
  thrFermentLimitUp: number;
  thrFermentMaxBoards: number;
}): StageThresholds {
  return {
    mainRiseLimitUp: s.thrMainRiseLimitUp,
    mainRiseSealRate: s.thrMainRiseSealRate,
    mainRiseMaxBoards: s.thrMainRiseMaxBoards,
    ebbLimitDown: s.thrEbbLimitDown,
    iceLimitUp: s.thrIceLimitUp,
    iceMaxBoards: s.thrIceMaxBoards,
    fermentLimitUp: s.thrFermentLimitUp,
    fermentMaxBoards: s.thrFermentMaxBoards,
  };
}

function num(v: number | null | undefined, fallback = 0): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

// 三核心指标方向：今日 vs 昨日
function trend(today: number | null, yesterday: number | null): "UP" | "DOWN" | "FLAT" {
  if (today == null || yesterday == null) return "FLAT";
  if (today > yesterday * 1.05) return "UP";
  if (today < yesterday * 0.95) return "DOWN";
  return "FLAT";
}

export function computeStage(
  today: SentimentMetrics,
  yesterday?: SentimentMetrics,
  caps: StageCaps = POSITION_CAP,
  thresholds: StageThresholds = DEFAULT_THRESHOLDS
): StageDecision {
  const limitUp = num(today.limitUpCount);
  const limitDown = num(today.limitDownCount);
  const sealRate = num(today.sealRate);
  const maxBoards = num(today.maxConsecBoards);

  const limitUpTrend = yesterday ? trend(today.limitUpCount, yesterday.limitUpCount) : "FLAT";
  const sealRateTrend = yesterday ? trend(today.sealRate, yesterday.sealRate) : "FLAT";
  const maxBoardsTrend = yesterday ? trend(today.maxConsecBoards, yesterday.maxConsecBoards) : "FLAT";

  // 主升：高位 + 封板率高 + 连板梯队
  if (
    limitUp >= thresholds.mainRiseLimitUp &&
    sealRate >= thresholds.mainRiseSealRate &&
    maxBoards >= thresholds.mainRiseMaxBoards
  ) {
    return {
      stage: "MAIN_RISE",
      positionCap: caps.MAIN_RISE,
      triggers: [
        `涨停 ${limitUp} 家 ≥ ${thresholds.mainRiseLimitUp}`,
        `封板率 ${(sealRate * 100).toFixed(0)}% ≥ ${(thresholds.mainRiseSealRate * 100).toFixed(0)}%`,
        `最高连板 ${maxBoards} ≥ ${thresholds.mainRiseMaxBoards}`,
      ],
    };
  }

  // 退潮：三核心同向走低 OR 高位放量杀跌
  const threeDown =
    limitUpTrend === "DOWN" && sealRateTrend === "DOWN" && maxBoardsTrend === "DOWN";
  if (threeDown || (limitDown >= thresholds.ebbLimitDown && sealRateTrend === "DOWN")) {
    const triggers: string[] = [];
    if (threeDown) triggers.push("涨停家数、封板率、连板高度同向走低");
    if (limitDown >= thresholds.ebbLimitDown) triggers.push(`跌停 ${limitDown} 家 ≥ ${thresholds.ebbLimitDown}`);
    if (sealRateTrend === "DOWN") triggers.push("封板率回落");
    return { stage: "EBB", positionCap: caps.EBB, triggers };
  }

  // 冰点：涨停极少 + 连板低 + 跌停明显
  if (limitUp < thresholds.iceLimitUp && maxBoards <= thresholds.iceMaxBoards) {
    return {
      stage: "ICE",
      positionCap: caps.ICE,
      triggers: [
        `涨停 ${limitUp} 家 < ${thresholds.iceLimitUp}`,
        `最高连板 ${maxBoards} ≤ ${thresholds.iceMaxBoards}`,
        ...(limitDown >= 20 ? [`跌停 ${limitDown} 家显著`] : []),
      ],
    };
  }

  // 发酵：涨停回升 + 出现高标
  if (
    limitUp >= thresholds.fermentLimitUp &&
    maxBoards >= thresholds.fermentMaxBoards &&
    limitUpTrend !== "DOWN"
  ) {
    return {
      stage: "FERMENT",
      positionCap: caps.FERMENT,
      triggers: [
        `涨停 ${limitUp} 家 ≥ ${thresholds.fermentLimitUp}`,
        `最高连板 ${maxBoards} ≥ ${thresholds.fermentMaxBoards}`,
        ...(limitUpTrend === "UP" ? ["涨停家数较昨日上升"] : []),
      ],
    };
  }

  // 默认：修复
  return {
    stage: "REPAIR",
    positionCap: caps.REPAIR,
    triggers: [
      `涨停 ${limitUp} 家、封板率 ${(sealRate * 100).toFixed(0)}%、连板 ${maxBoards}`,
      "未触发主升/发酵/退潮/冰点条件，默认修复期",
    ],
  };
}
