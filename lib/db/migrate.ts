/**
 * Runs on every server cold-start (via instrumentation.ts).
 * Creates all tables if missing and seeds preset error types.
 * All statements are idempotent (IF NOT EXISTS / INSERT OR IGNORE).
 */
import { client, db } from "./index";
import * as schema from "./schema";

const DDL = [
  `CREATE TABLE IF NOT EXISTS weekly_reviews (
    id TEXT PRIMARY KEY,
    week_start INTEGER NOT NULL UNIQUE,
    week_end INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'DRAFT',
    best_thing TEXT NOT NULL DEFAULT '',
    worst_thing TEXT NOT NULL DEFAULT '',
    do_over TEXT NOT NULL DEFAULT '',
    discipline_items TEXT NOT NULL,
    discipline_total INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    completed_at INTEGER
  )`,
  `CREATE TABLE IF NOT EXISTS holdings (
    id TEXT PRIMARY KEY,
    stock_code TEXT NOT NULL,
    stock_name TEXT NOT NULL,
    stock_market TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'HOLDING',
    cost_price REAL NOT NULL,
    current_price REAL,
    shares INTEGER NOT NULL,
    sector TEXT NOT NULL DEFAULT '',
    logic TEXT NOT NULL,
    prerequisites TEXT NOT NULL,
    exit_conditions TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS monthly_portraits (
    id TEXT PRIMARY KEY,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'DRAFT',
    reflection TEXT NOT NULL DEFAULT '',
    next_focus TEXT NOT NULL DEFAULT '',
    problem_evals TEXT NOT NULL DEFAULT '[]',
    created_at INTEGER NOT NULL,
    completed_at INTEGER,
    UNIQUE(year, month)
  )`,
  `CREATE TABLE IF NOT EXISTS decisions (
    id TEXT PRIMARY KEY,
    stock_code TEXT NOT NULL,
    stock_name TEXT NOT NULL,
    stock_market TEXT NOT NULL,
    action TEXT NOT NULL,
    price REAL NOT NULL,
    quantity INTEGER NOT NULL,
    amount REAL NOT NULL,
    reason TEXT NOT NULL,
    basis TEXT NOT NULL,
    system_alignment TEXT NOT NULL,
    calm_score INTEGER NOT NULL,
    confidence_score INTEGER NOT NULL,
    fomo_score INTEGER NOT NULL,
    stop_loss_price REAL NOT NULL,
    max_acceptable_loss REAL NOT NULL,
    actual_price REAL,
    price_after_7_days REAL,
    price_after_30_days REAL,
    return_30_days REAL,
    danger_signals TEXT NOT NULL,
    post_reflection TEXT,
    is_archived INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS goals (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL DEFAULT '',
    start_amount REAL NOT NULL,
    target_amount REAL NOT NULL,
    years INTEGER NOT NULL,
    required_return REAL NOT NULL,
    realism_score INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    note TEXT NOT NULL DEFAULT '',
    checkins TEXT NOT NULL DEFAULT '[]',
    created_at INTEGER NOT NULL,
    target_date INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS error_types (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    is_preset INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS error_logs (
    id TEXT PRIMARY KEY,
    error_type_id TEXT NOT NULL REFERENCES error_types(id),
    decision_id TEXT REFERENCES decisions(id),
    note TEXT NOT NULL DEFAULT '',
    cost REAL,
    occurred_at INTEGER NOT NULL
  )`,
  // Indexes
  `CREATE INDEX IF NOT EXISTS idx_error_logs_type ON error_logs(error_type_id)`,
  `CREATE INDEX IF NOT EXISTS idx_error_logs_decision ON error_logs(decision_id)`,
  `CREATE INDEX IF NOT EXISTS idx_error_logs_occurred ON error_logs(occurred_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_decisions_created_at ON decisions(created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_decisions_fomo ON decisions(fomo_score, is_archived)`,
  `CREATE INDEX IF NOT EXISTS idx_decisions_calm ON decisions(calm_score, is_archived)`,
  `CREATE INDEX IF NOT EXISTS idx_decisions_alignment_created ON decisions(system_alignment, created_at)`,
];

const PRESET_ERRORS = [
  { id: "preset_chasing",     name: "追高",     description: "情绪驱动买入当日冲高股，追涨停或大幅上涨后入场" },
  { id: "preset_averaging",   name: "越跌越补",  description: "持仓亏损后继续加仓，扩大本金暴露而非执行止损" },
  { id: "preset_no_profit",   name: "不止盈",   description: "浮盈时未兑现，等待更高位置导致盈利大幅缩水或转亏" },
  { id: "preset_overtrading", name: "频繁交易",  description: "短期内反复操作同一标的，手续费侵蚀收益" },
  { id: "preset_gut_feel",    name: "凭感觉",   description: "缺乏明确依据下单，无法事后验证判断对错" },
  { id: "preset_following",   name: "跟风",     description: "看到他人买卖后跟随操作，没有独立判断" },
  { id: "preset_no_stop",     name: "不止损",   description: "亏损超过预设止损价却拒绝执行，期待行情反转" },
];

let migrated = false;

export async function runMigrations(): Promise<void> {
  // Only run once per process lifetime (handles dev hot-reload)
  if (migrated) return;
  migrated = true;

  try {
    // Run all DDL statements in a single batch for efficiency
    await client.batch(
      DDL.map((sql) => ({ sql, args: [] })),
      "write"
    );

    // Seed preset error types (INSERT OR IGNORE — fully idempotent)
    const now = Date.now();
    await db
      .insert(schema.errorTypes)
      .values(
        PRESET_ERRORS.map((e) => ({
          id: e.id,
          name: e.name,
          description: e.description,
          isPreset: 1 as unknown as boolean,
          createdAt: now,
        }))
      )
      .onConflictDoNothing();

    console.log("[db] migrations done");
  } catch (err) {
    // Log but don't crash — if tables already exist this is safe
    console.error("[db] migration error", err);
  }
}
