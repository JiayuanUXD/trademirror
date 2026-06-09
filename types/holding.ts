export type HoldingStatus = "HOLDING" | "WATCHING" | "CLOSED";

export const STATUS_LABELS: Record<HoldingStatus, string> = {
  HOLDING: "持有",
  WATCHING: "观察",
  CLOSED: "已清仓",
};

export const STATUS_COLORS: Record<HoldingStatus, string> = {
  HOLDING: "var(--brand-green)",
  WATCHING: "var(--brand-warning)",
  CLOSED: "var(--muted-foreground)",
};

export type LogicReason = {
  id: string;
  content: string;
  hasData: boolean;
  isVerifiable: boolean;
};

export type Prerequisite = {
  id: string;
  content: string;
  checked: boolean;
};

export type ExitConditionType =
  | "PRICE_BELOW"
  | "EARNINGS_BELOW"
  | "TECH_BREAK"
  | "TRAILING_STOP"
  | "CUSTOM";

export const EXIT_CONDITION_LABELS: Record<ExitConditionType, string> = {
  PRICE_BELOW: "跌破止损价",
  EARNINGS_BELOW: "业绩增速低于",
  TECH_BREAK: "跌破技术位",
  TRAILING_STOP: "移动止盈",
  CUSTOM: "自定义条件",
};

export type ExitCondition = {
  id: string;
  type: ExitConditionType;
  description: string;
  threshold?: number;
  triggered: boolean;
};

export type HoldingLogic = {
  reasons: LogicReason[];
  moat: string;
  keyFinancials: string;
  logicScore: number;
};

export type Holding = {
  id: string;
  stockCode: string;
  stockName: string;
  stockMarket: "SH" | "SZ" | "BJ";
  status: HoldingStatus;
  costPrice: number;
  currentPrice: number | null;
  shares: number;
  sector: string;
  logic: HoldingLogic;
  prerequisites: Prerequisite[];
  exitConditions: ExitCondition[];
  healthScore: number;
  createdAt: number;
  updatedAt: number;
  /** 首次买入时间（毫秒时间戳），用于计算持仓天数 */
  firstBuyAt?: number;
  /**
   * true = 由决策卡自动聚合而来，尚未在 holdings 表建立正式档案。
   * 此类持仓只读，需用户点击「建档」后方可编辑逻辑/前提/撤退条件。
   */
  inferred?: boolean;
};

export type CreateHoldingInput = {
  stockCode: string;
  stockName: string;
  stockMarket: "SH" | "SZ" | "BJ";
  status: HoldingStatus;
  costPrice: number;
  shares: number;
  sector?: string;
  initialReason?: string;
};
