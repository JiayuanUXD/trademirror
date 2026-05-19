export type StockMarket = "SH" | "SZ" | "BJ";

export type DecisionAction = "BUY" | "ADD" | "SELL" | "REDUCE" | "CLEAR";

export const ACTION_LABELS: Record<DecisionAction, string> = {
  BUY: "买入",
  ADD: "加仓",
  SELL: "卖出",
  REDUCE: "减仓",
  CLEAR: "清仓",
};

export type RationalBasis =
  | "基本面变化"
  | "技术面信号"
  | "板块轮动"
  | "大盘环境"
  | "执行计划"
  | "消息面催化";

export type IrrationalBasis =
  | "凭感觉"
  | "看到别人买卖"
  | "情绪驱动"
  | "想试试看"
  | "熟人/群友推荐";

export type DecisionBasis = RationalBasis | IrrationalBasis;

export const RATIONAL_BASIS: RationalBasis[] = [
  "基本面变化",
  "技术面信号",
  "板块轮动",
  "大盘环境",
  "执行计划",
  "消息面催化",
];

export const IRRATIONAL_BASIS: IrrationalBasis[] = [
  "凭感觉",
  "看到别人买卖",
  "情绪驱动",
  "想试试看",
  "熟人/群友推荐",
];

export type SystemAlignment = "ALIGN" | "PARTIAL" | "NOT_ALIGN";

export const ALIGNMENT_LABELS: Record<SystemAlignment, string> = {
  ALIGN: "符合",
  PARTIAL: "部分符合",
  NOT_ALIGN: "不符合",
};

export type DangerSignal =
  | "FOMO过高"
  | "心态不稳"
  | "不符合体系"
  | "非理性决策依据";

export type DecisionStatus = "ACTIVE" | "VOIDED" | "ARCHIVED";

export const STATUS_LABELS: Record<DecisionStatus, string> = {
  ACTIVE: "活跃",
  VOIDED: "已作废",
  ARCHIVED: "已归档",
};

export type VoidedReason = "INPUT_ERROR" | "DUPLICATE" | "NOT_MINE";

export const VOIDED_REASON_LABELS: Record<VoidedReason, string> = {
  INPUT_ERROR: "录入错误",
  DUPLICATE: "重复提交",
  NOT_MINE: "非本人操作",
};

export type Decision = {
  id: string;
  stockCode: string;
  stockName: string;
  stockMarket: StockMarket;
  action: DecisionAction;
  price: number;
  quantity: number;
  amount: number;
  reason: string;
  basis: DecisionBasis[];
  systemAlignment: SystemAlignment;
  calmScore: number;
  confidenceScore: number;
  fomoScore: number;
  stopLossPrice: number;
  maxAcceptableLoss: number;
  actualPrice: number | null;
  priceAfter7Days: number | null;
  priceAfter30Days: number | null;
  return30Days: number | null;
  dangerSignals: DangerSignal[];
  postReflection: string | null;
  status: DecisionStatus;
  voidedReason: VoidedReason | null;
  voidedAt: number | null;
  parentId: string | null;
  createdAt: number;
};

export type CreateDecisionInput = Omit<
  Decision,
  "id" | "actualPrice" | "priceAfter7Days" | "priceAfter30Days" | "return30Days" | "postReflection" | "status" | "voidedReason" | "voidedAt" | "parentId" | "createdAt"
>;
