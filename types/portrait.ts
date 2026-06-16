export type PortraitStatus = "DRAFT" | "COMPLETED";

export type ProblemEval = "IMPROVED" | "STABLE" | "WORSENED";

export type ProblemId =
  | "overleverage"
  | "chasing_hot"
  | "averaging_down"
  | "no_profit_taking"
  | "emotional_trading"
  | "unrealistic_goals";

export const PROBLEM_DEFINITIONS: Record<ProblemId, { label: string; desc: string; autoHint?: string }> = {
  overleverage:      { label: "满仓加杠杆",     desc: "超高仓位或借入资金操作" },
  chasing_hot:       { label: "重仓追热点",     desc: "未研究就追入热门板块/个股" },
  averaging_down:    { label: "越跌越补",       desc: "亏损股持续加仓扩大亏损" },
  no_profit_taking:  { label: "盈利不止盈",     desc: "浮盈缩水直至变浮亏" },
  emotional_trading: { label: "情绪化交易",     desc: "被盘中波动绑架，追高杀跌" },
  unrealistic_goals: { label: "目标不切实际",   desc: "追求快速回本，重仓豪赌" },
};

export const PROBLEM_IDS = Object.keys(PROBLEM_DEFINITIONS) as ProblemId[];

export const NEXT_FOCUS_OPTIONS: { id: ProblemId; label: string }[] = PROBLEM_IDS.map(
  (id) => ({ id, label: PROBLEM_DEFINITIONS[id].label })
);

export type ProblemEvalItem = { id: ProblemId; eval: ProblemEval };

export type KeyTradeKind = "SUCCESS" | "FAILURE" | "REFLECT";

// 月度三笔关键交易：成功 / 失败 / 反思
// 反思 = 结果好但过程糟，例如 FOMO 重却赌赢了
export type KeyTradeItem = {
  decisionId: string;
  errorClassification: "NEW" | "OLD" | "";  // OLD 时关联 errorTypeId
  errorTypeId?: string | null;
  note: string;                              // ≤50 字
};

export type KeyTrades = {
  success?: KeyTradeItem;
  failure?: KeyTradeItem;
  reflect?: KeyTradeItem;
};

export type KeyTradeCandidate = {
  decisionId: string;
  stockCode: string;
  stockName: string;
  action: string;
  price: number;
  return30Days: number | null;
  fomoScore: number;
  calmScore: number;
  systemAlignment: string;
  dangerSignalCount: number;
  tradedAt: number | null;
  createdAt: number;
};

export type MonthlyPortrait = {
  id: string;
  year: number;
  month: number;
  status: PortraitStatus;
  reflection: string;
  nextFocus: ProblemId | "";
  problemEvals: ProblemEvalItem[];
  keyTrades: KeyTrades;
  createdAt: number;
  completedAt: number | null;
  // computed — not stored
  decisionCount: number;
  dangerCount: number;
  fomoAvg: number;
  calmAvg: number;
  irrationalPct: number;
  avgDiscipline: number;
  emotionalCount: number;
  // 系统给的三笔候选
  keyTradeCandidates: {
    success: KeyTradeCandidate[];
    failure: KeyTradeCandidate[];
    reflect: KeyTradeCandidate[];
  };
};
