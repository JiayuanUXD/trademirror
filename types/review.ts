export type ReviewStatus = "DRAFT" | "COMPLETED";

export type DisciplineScore = 0 | 1 | 2;

export type DisciplineItem = {
  id: string;
  label: string;
  score: DisciplineScore;
  autoSuggested?: DisciplineScore;
};

export const DISCIPLINE_DEFINITIONS = [
  { id: "no_leverage",     label: "没有满仓加杠杆",             auto: false },
  { id: "no_chasing",      label: "没有追涨停/单日涨超7%股票",   auto: false },
  { id: "no_concentration",label: "单一持仓未超25%",             auto: false },
  { id: "all_cards_filled",label: "每笔操作都填了决策卡",         auto: true  },
  { id: "no_panic",        label: "没有盘中追高/恐慌杀跌",       auto: false },
  { id: "no_tips",         label: "没有看股吧/荐股群",           auto: false },
  { id: "limited_trades",  label: "每周操作未超2次",             auto: true  },
] as const;

export type WeeklyReview = {
  id: string;
  weekStart: number; // unix ms, Monday 00:00
  weekEnd: number;   // unix ms, Sunday 23:59:59
  status: ReviewStatus;
  bestThing: string;
  worstThing: string;
  doOver: string;
  disciplineItems: DisciplineItem[];
  disciplineTotal: number;
  createdAt: number;
  completedAt: number | null;
  // computed — not stored
  weekDecisionCount: number;
  dangerTradeCount: number;
  highFomoCount: number;
};

export type CreateReviewInput = {
  weekStart: number;
  weekEnd: number;
};

export type PatchReviewInput = {
  bestThing?: string;
  worstThing?: string;
  doOver?: string;
  disciplineItems?: DisciplineItem[];
  complete?: boolean;
};
