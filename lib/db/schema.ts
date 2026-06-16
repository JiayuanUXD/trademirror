import { sqliteTable, text, integer, real, primaryKey, uniqueIndex } from "drizzle-orm/sqlite-core";

// ─── NextAuth Adapter Tables ─────────────────────────────────────────────────

export const users = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name"),
  email: text("email").notNull(),
  emailVerified: integer("emailVerified", { mode: "timestamp_ms" }),
  image: text("image"),
  role: text("role").notNull().default("user"),
  disabled: integer("disabled", { mode: "boolean" }).notNull().default(false),
  passwordHash: text("password_hash"),
  passwordChangedAt: integer("password_changed_at"),
  createdAt: integer("created_at").notNull().$defaultFn(() => Date.now()),
});

export const accounts = sqliteTable(
  "account",
  {
    userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<"oauth" | "oidc" | "email" | "credentials">().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => ({
    compositePk: primaryKey({ columns: [account.provider, account.providerAccountId] }),
  })
);

export const sessions = sqliteTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  expires: integer("expires", { mode: "timestamp_ms" }).notNull(),
});

export const verificationTokens = sqliteTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: integer("expires", { mode: "timestamp_ms" }).notNull(),
  },
  (vt) => ({
    compositePk: primaryKey({ columns: [vt.identifier, vt.token] }),
  })
);

// ─── Business Tables ─────────────────────────────────────────────────────────

export const weeklyReviews = sqliteTable("weekly_reviews", {
  id: text("id").primaryKey(),
  weekStart: integer("week_start").notNull(),
  weekEnd: integer("week_end").notNull(),
  status: text("status").$type<"DRAFT" | "COMPLETED">().notNull().default("DRAFT"),
  bestThing: text("best_thing").notNull().default(""),
  worstThing: text("worst_thing").notNull().default(""),
  doOver: text("do_over").notNull().default(""),
  disciplineItems: text("discipline_items").notNull(),
  disciplineTotal: integer("discipline_total").notNull().default(0),
  createdAt: integer("created_at").notNull(),
  completedAt: integer("completed_at"),
  userId: text("user_id").notNull(),
}, (table) => ({
  weekStartUserUnique: uniqueIndex("idx_weekly_reviews_week_user").on(table.weekStart, table.userId),
}));

export const holdings = sqliteTable("holdings", {
  id: text("id").primaryKey(),
  stockCode: text("stock_code").notNull(),
  stockName: text("stock_name").notNull(),
  stockMarket: text("stock_market").$type<"SH" | "SZ" | "BJ">().notNull(),
  status: text("status").$type<"HOLDING" | "WATCHING" | "CLOSED">().notNull(),
  costPrice: real("cost_price").notNull(),
  currentPrice: real("current_price"),
  shares: integer("shares").notNull(),
  sector: text("sector").default("").notNull(),
  logic: text("logic").notNull(),
  prerequisites: text("prerequisites").notNull(),
  exitConditions: text("exit_conditions").notNull(),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
  userId: text("user_id").notNull(),
});

export const monthlyPortraits = sqliteTable("monthly_portraits", {
  id: text("id").primaryKey(),
  year: integer("year").notNull(),
  month: integer("month").notNull(),
  status: text("status").$type<"DRAFT" | "COMPLETED">().notNull().default("DRAFT"),
  reflection: text("reflection").notNull().default(""),
  nextFocus: text("next_focus").notNull().default(""),
  problemEvals: text("problem_evals").notNull().default("[]"),
  keyTrades: text("key_trades").notNull().default("{}"),
  createdAt: integer("created_at").notNull(),
  completedAt: integer("completed_at"),
  userId: text("user_id").notNull(),
}, (table) => ({
  yearMonthUserUnique: uniqueIndex("idx_monthly_portraits_year_month_user").on(table.year, table.month, table.userId),
}));

export const goals = sqliteTable("goals", {
  id: text("id").primaryKey(),
  title: text("title").notNull().default(""),
  startAmount: real("start_amount").notNull(),
  targetAmount: real("target_amount").notNull(),
  years: integer("years").notNull(),
  requiredReturn: real("required_return").notNull(),
  realismScore: integer("realism_score").notNull(),
  status: text("status").$type<"ACTIVE" | "ACHIEVED" | "ABANDONED">().notNull().default("ACTIVE"),
  note: text("note").notNull().default(""),
  checkins: text("checkins").notNull().default("[]"),
  createdAt: integer("created_at").notNull(),
  targetDate: integer("target_date").notNull(),
  userId: text("user_id").notNull(),
});

export const errorTypes = sqliteTable("error_types", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  isPreset: integer("is_preset", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at").notNull(),
  userId: text("user_id").notNull(),
});

export const errorLogs = sqliteTable("error_logs", {
  id: text("id").primaryKey(),
  errorTypeId: text("error_type_id").notNull(),
  decisionId: text("decision_id"),
  note: text("note").notNull().default(""),
  cost: real("cost"),
  occurredAt: integer("occurred_at").notNull(),
  userId: text("user_id").notNull(),
});

export const decisions = sqliteTable("decisions", {
  id: text("id").primaryKey(),
  stockCode: text("stock_code").notNull(),
  stockName: text("stock_name").notNull(),
  stockMarket: text("stock_market").$type<"SH" | "SZ" | "BJ">().notNull(),
  action: text("action")
    .$type<"BUY" | "ADD" | "SELL" | "REDUCE" | "CLEAR">()
    .notNull(),
  price: real("price").notNull(),
  quantity: integer("quantity").notNull(),
  amount: real("amount").notNull(),
  reason: text("reason").notNull(),
  basis: text("basis").notNull(),
  systemAlignment: text("system_alignment")
    .$type<"ALIGN" | "PARTIAL" | "NOT_ALIGN">()
    .notNull(),
  calmScore: integer("calm_score").notNull(),
  confidenceScore: integer("confidence_score").notNull(),
  fomoScore: integer("fomo_score").notNull(),
  stopLossPrice: real("stop_loss_price").notNull(),
  maxAcceptableLoss: real("max_acceptable_loss").notNull(),
  actualPrice: real("actual_price"),
  priceAfter7Days: real("price_after_7_days"),
  priceAfter30Days: real("price_after_30_days"),
  return30Days: real("return_30_days"),
  dangerSignals: text("danger_signals").notNull(),
  postReflection: text("post_reflection"),
  status: text("status")
    .$type<"ACTIVE" | "VOIDED" | "ARCHIVED">()
    .notNull()
    .default("ACTIVE"),
  voidedReason: text("voided_reason").$type<"INPUT_ERROR" | "DUPLICATE" | "NOT_MINE">(),
  voidedAt: integer("voided_at"),
  parentId: text("parent_id"),
  incomplete: integer("incomplete").notNull().default(0),
  tradedAt: integer("traded_at"),
  createdAt: integer("created_at").notNull(),
  userId: text("user_id").notNull(),
});

export const dailyDigests = sqliteTable("daily_digests", {
  id: text("id").primaryKey(),
  tradeDate: text("trade_date").notNull(),       // YYYYMMDD
  marketData: text("market_data").notNull(),      // JSON: 三大指数数据
  stockAnalyses: text("stock_analyses").notNull(),// JSON: [{stockCode, indicators, signals}]
  digestText: text("digest_text").notNull(),      // AI 生成的完整分析文本
  generatedAt: integer("generated_at").notNull(),
  createdAt: integer("created_at").notNull(),
  userId: text("user_id").notNull(),
}, (table) => ({
  tradeDateUserUnique: uniqueIndex("idx_daily_digests_date_user").on(table.tradeDate, table.userId),
}));

export const digestShares = sqliteTable("digest_shares", {
  token: text("token").primaryKey(),             // 随机短 token (nanoid 12位)
  tradeDate: text("trade_date").notNull(),
  marketData: text("market_data").notNull(),
  stockAnalyses: text("stock_analyses").notNull(),
  digestText: text("digest_text").notNull(),
  createdAt: integer("created_at").notNull(),
  expiresAt: integer("expires_at"),              // null = 永不过期
  userId: text("user_id").notNull(),
});

export const settings = sqliteTable("settings", {
  id: text("id").primaryKey(),
  displayName: text("display_name").notNull().default(""),
  maxPositionPct: integer("max_position_pct").notNull().default(25),
  weeklyTradeLimit: integer("weekly_trade_limit").notNull().default(2),
  defaultStopLossPct: integer("default_stop_loss_pct").notNull().default(10),
  totalCapital: real("total_capital").notNull().default(0),
  dailyOpenLimit: integer("daily_open_limit").notNull().default(2),
  // 5 个阶段对应的总仓位上限，0~1。默认值与 lib/sentiment/stage.ts 的 POSITION_CAP 一致
  capIce: real("cap_ice").notNull().default(0.20),
  capRepair: real("cap_repair").notNull().default(0.50),
  capFerment: real("cap_ferment").notNull().default(0.80),
  capMainRise: real("cap_main_rise").notNull().default(1.00),
  capEbb: real("cap_ebb").notNull().default(0.30),
  // 阶段判定阈值（默认值与 lib/sentiment/stage.ts 的硬编码一致）
  thrMainRiseLimitUp: integer("thr_main_rise_limit_up").notNull().default(80),
  thrMainRiseSealRate: real("thr_main_rise_seal_rate").notNull().default(0.70),
  thrMainRiseMaxBoards: integer("thr_main_rise_max_boards").notNull().default(5),
  thrEbbLimitDown: integer("thr_ebb_limit_down").notNull().default(30),
  thrIceLimitUp: integer("thr_ice_limit_up").notNull().default(30),
  thrIceMaxBoards: integer("thr_ice_max_boards").notNull().default(2),
  thrFermentLimitUp: integer("thr_ferment_limit_up").notNull().default(50),
  thrFermentMaxBoards: integer("thr_ferment_max_boards").notNull().default(4),
  // 选股漏斗 · 流动性过滤参数（per user）
  minTurnoverYi: real("min_turnover_yi").notNull().default(1.0),
  minTurnoverRatePct: real("min_turnover_rate_pct").notNull().default(3.0),
  maxTurnoverRatePct: real("max_turnover_rate_pct").notNull().default(25.0),
  minPrice: real("min_price").notNull().default(3),
  maxPrice: real("max_price").notNull().default(200),
  excludeSt: integer("exclude_st", { mode: "boolean" }).notNull().default(true),
  excludeNew: integer("exclude_new", { mode: "boolean" }).notNull().default(true),
  maxPoolSize: integer("max_pool_size").notNull().default(8),
  userId: text("user_id").notNull(),
});

// ─── 交易系统养成模块（PRD-交易系统养成模块） ───────────────────────────────

// 市场级：每日情绪指标快照（全局共享，无 userId）
export const marketSentimentDaily = sqliteTable("market_sentiment_daily", {
  tradeDate: text("trade_date").primaryKey(),         // YYYY-MM-DD
  limitUpCount: integer("limit_up_count"),            // 涨停家数
  limitDownCount: integer("limit_down_count"),        // 跌停家数
  sealRate: real("seal_rate"),                        // 封板率 0~1
  maxConsecBoards: integer("max_consec_boards"),      // 最高连板高度
  turnoverYi: real("turnover_yi"),                    // 两市成交额（亿）
  prevLimitPremium: real("prev_limit_premium"),       // 昨涨停今日溢价 %
  rawPayload: text("raw_payload"),                    // 原始抓取 JSON 备查
  createdAt: integer("created_at").notNull(),
});

// 市场级：每日阶段结论（全局共享）
export const dailyMarketState = sqliteTable("daily_market_state", {
  tradeDate: text("trade_date").primaryKey(),
  stage: text("stage").$type<"ICE" | "REPAIR" | "FERMENT" | "MAIN_RISE" | "EBB">().notNull(),
  positionCap: real("position_cap").notNull(),       // 0~1，联动总仓位上限
  triggerSnapshot: text("trigger_snapshot").notNull(),// 触发该结论的指标 JSON
  createdAt: integer("created_at").notNull(),
});

// 用户级：选股漏斗每次扫描快照
export const screenerPoolSnapshot = sqliteTable("screener_pool_snapshot", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  tradeDate: text("trade_date").notNull(),            // YYYY-MM-DD
  runAt: integer("run_at").notNull(),                 // epoch ms
  stageAtRun: text("stage_at_run").$type<"ICE" | "REPAIR" | "FERMENT" | "MAIN_RISE" | "EBB">().notNull(),
  gateStatus: text("gate_status").$type<"OPEN" | "PAUSED" | "LIMITED">().notNull(),
  gateMaxSize: integer("gate_max_size").notNull(),    // 0 = 暂停
  poolSize: integer("pool_size").notNull(),           // 实际入池数
  universeSize: integer("universe_size").notNull(),   // 扫描的全市场总数
  filteredSummary: text("filtered_summary").notNull().default("{}"), // JSON：每层剔除多少
  createdAt: integer("created_at").notNull(),
});

// 用户级：选股候选明细
export const screenerCandidate = sqliteTable("screener_candidate", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  snapshotId: text("snapshot_id").notNull(),
  symbol: text("symbol").notNull(),                   // 6 位代码
  name: text("name").notNull(),
  price: real("price").notNull(),
  turnoverYi: real("turnover_yi").notNull(),          // 当日成交额（亿）
  turnoverRatePct: real("turnover_rate_pct").notNull(),
  volumeRatio: real("volume_ratio"),
  amplitudePct: real("amplitude_pct"),
  score: real("score").notNull().default(0.5),
  reasonTags: text("reason_tags").notNull().default("[]"), // JSON 数组
  retT1: real("ret_t1"),
  retT3: real("ret_t3"),
  retT5: real("ret_t5"),
  filledAt: integer("filled_at"),
  createdAt: integer("created_at").notNull(),
});

// 用户级：行为护栏触发日志
export const guardrailEvents = sqliteTable("guardrail_events", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  eventType: text("event_type")
    .$type<"ADD_TO_LOSS" | "OVER_SINGLE_POS" | "OVER_TOTAL_POS" | "OVER_DAILY_COUNT" | "MISSING_STOP">()
    .notNull(),
  decisionRef: text("decision_ref"),                  // 关联决策卡 id
  payload: text("payload").notNull().default("{}"),   // JSON：触发上下文
  outcome: text("outcome").$type<"BLOCKED" | "WARNED" | "OVERRIDDEN">().notNull(),
  createdAt: integer("created_at").notNull(),
});
