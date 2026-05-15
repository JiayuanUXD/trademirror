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
  isArchived: integer("is_archived", { mode: "boolean" }).default(false).notNull(),
  createdAt: integer("created_at").notNull(),
  userId: text("user_id").notNull(),
});

export const settings = sqliteTable("settings", {
  id: text("id").primaryKey(),
  displayName: text("display_name").notNull().default(""),
  maxPositionPct: integer("max_position_pct").notNull().default(25),
  weeklyTradeLimit: integer("weekly_trade_limit").notNull().default(2),
  defaultStopLossPct: integer("default_stop_loss_pct").notNull().default(10),
  totalCapital: real("total_capital").notNull().default(0),
  userId: text("user_id").notNull(),
});
