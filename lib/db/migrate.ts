import { client, db } from "./index";
import * as schema from "./schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

// ─── DDL for all tables (idempotent — IF NOT EXISTS) ────────────────────────

const CREATE_TABLES = [
  // Auth tables
  `CREATE TABLE IF NOT EXISTS user (
    id TEXT PRIMARY KEY,
    name TEXT,
    email TEXT NOT NULL,
    emailVerified INTEGER,
    image TEXT,
    role TEXT NOT NULL DEFAULT 'user',
    disabled INTEGER NOT NULL DEFAULT 0,
    password_hash TEXT,
    password_changed_at INTEGER,
    created_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS account (
    userId TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    provider TEXT NOT NULL,
    providerAccountId TEXT NOT NULL,
    refresh_token TEXT,
    access_token TEXT,
    expires_at INTEGER,
    token_type TEXT,
    scope TEXT,
    id_token TEXT,
    session_state TEXT,
    PRIMARY KEY (provider, providerAccountId)
  )`,
  `CREATE TABLE IF NOT EXISTS session (
    sessionToken TEXT PRIMARY KEY,
    userId TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
    expires INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS verificationToken (
    identifier TEXT NOT NULL,
    token TEXT NOT NULL,
    expires INTEGER NOT NULL,
    PRIMARY KEY (identifier, token)
  )`,
  // Business tables
  `CREATE TABLE IF NOT EXISTS weekly_reviews (
    id TEXT PRIMARY KEY,
    week_start INTEGER NOT NULL,
    week_end INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'DRAFT',
    best_thing TEXT NOT NULL DEFAULT '',
    worst_thing TEXT NOT NULL DEFAULT '',
    do_over TEXT NOT NULL DEFAULT '',
    discipline_items TEXT NOT NULL,
    discipline_total INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    completed_at INTEGER,
    user_id TEXT NOT NULL,
    UNIQUE(week_start, user_id)
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
    updated_at INTEGER NOT NULL,
    user_id TEXT NOT NULL
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
    user_id TEXT NOT NULL,
    UNIQUE(year, month, user_id)
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
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    voided_reason TEXT,
    voided_at INTEGER,
    parent_id TEXT,
    incomplete INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    user_id TEXT NOT NULL
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
    target_date INTEGER NOT NULL,
    user_id TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS error_types (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    is_preset INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    user_id TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS error_logs (
    id TEXT PRIMARY KEY,
    error_type_id TEXT NOT NULL REFERENCES error_types(id),
    decision_id TEXT REFERENCES decisions(id),
    note TEXT NOT NULL DEFAULT '',
    cost REAL,
    occurred_at INTEGER NOT NULL,
    user_id TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS settings (
    id TEXT PRIMARY KEY,
    display_name TEXT NOT NULL DEFAULT '',
    max_position_pct INTEGER NOT NULL DEFAULT 25,
    weekly_trade_limit INTEGER NOT NULL DEFAULT 2,
    default_stop_loss_pct INTEGER NOT NULL DEFAULT 10,
    total_capital REAL NOT NULL DEFAULT 0,
    user_id TEXT NOT NULL
  )`,
];

// Indexes must run AFTER ALTER TABLE (user_id columns may not exist yet on old DBs)
const CREATE_INDEXES = [
  `CREATE INDEX IF NOT EXISTS idx_error_logs_type ON error_logs(error_type_id)`,
  `CREATE INDEX IF NOT EXISTS idx_error_logs_decision ON error_logs(decision_id)`,
  `CREATE INDEX IF NOT EXISTS idx_error_logs_occurred ON error_logs(occurred_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_decisions_created_at ON decisions(created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_decisions_fomo ON decisions(fomo_score, status)`,
  `CREATE INDEX IF NOT EXISTS idx_decisions_calm ON decisions(calm_score, status)`,
  `CREATE INDEX IF NOT EXISTS idx_decisions_alignment_created ON decisions(system_alignment, created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_decisions_user ON decisions(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_holdings_user ON holdings(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_weekly_reviews_user ON weekly_reviews(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_monthly_portraits_user ON monthly_portraits(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_goals_user ON goals(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_error_types_user ON error_types(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_error_logs_user ON error_logs(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_settings_user ON settings(user_id)`,
];

// ─── Migration: add userId to existing tables (for databases created before auth) ──

const ALTER_TABLES: { table: string; column: string; def: string }[] = [
  { table: "user", column: "password_changed_at", def: "INTEGER" },
  { table: "weekly_reviews", column: "user_id", def: "TEXT NOT NULL DEFAULT 'jiayuan'" },
  { table: "holdings", column: "user_id", def: "TEXT NOT NULL DEFAULT 'jiayuan'" },
  { table: "monthly_portraits", column: "user_id", def: "TEXT NOT NULL DEFAULT 'jiayuan'" },
  { table: "decisions", column: "user_id", def: "TEXT NOT NULL DEFAULT 'jiayuan'" },
  { table: "goals", column: "user_id", def: "TEXT NOT NULL DEFAULT 'jiayuan'" },
  { table: "error_types", column: "user_id", def: "TEXT NOT NULL DEFAULT 'jiayuan'" },
  { table: "error_logs", column: "user_id", def: "TEXT NOT NULL DEFAULT 'jiayuan'" },
  { table: "settings", column: "user_id", def: "TEXT NOT NULL DEFAULT 'jiayuan'" },
  { table: "decisions", column: "status", def: "TEXT NOT NULL DEFAULT 'ACTIVE'" },
  { table: "decisions", column: "voided_reason", def: "TEXT" },
  { table: "decisions", column: "voided_at", def: "INTEGER" },
  { table: "decisions", column: "parent_id", def: "TEXT" },
  { table: "decisions", column: "incomplete", def: "INTEGER NOT NULL DEFAULT 0" },
];

// ─── Preset Error Types ─────────────────────────────────────────────────────

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

async function addColumnIfMissing(table: string, column: string, def: string): Promise<void> {
  try {
    await client.execute({
      sql: `ALTER TABLE ${table} ADD COLUMN ${column} ${def}`,
      args: [],
    });
    console.log(`[db] added column ${column} to ${table}`);
  } catch {
    // column already exists — expected on fresh installs
  }
}

async function recreateTable(
  table: string,
  createSql: string
): Promise<void> {
  try {
    const result = await client.execute({
      sql: `SELECT sql FROM sqlite_master WHERE type='table' AND name=?`,
      args: [table],
    });
    const currentSql = result.rows[0]?.sql as string | undefined;
    if (!currentSql) return;

    const hasOldWeeklyUnique =
      table === "weekly_reviews" &&
      /\bweek_start\b[^,]*\bUNIQUE\b/i.test(currentSql) &&
      !currentSql.toLowerCase().includes("unique(week_start, user_id)");

    const hasOldMonthlyUnique =
      table === "monthly_portraits" &&
      /\bUNIQUE\s*\(\s*year\s*,\s*month\s*\)/i.test(currentSql) &&
      !currentSql.toLowerCase().includes("user_id");

    if (!hasOldWeeklyUnique && !hasOldMonthlyUnique) return;

    console.log(`[db] fixing unique constraints on ${table}`);

    const tmpTable = `${table}_tmp`;
    await client.execute({ sql: `DROP TABLE IF EXISTS ${tmpTable}`, args: [] });
    await client.execute({ sql: createSql.replace(table, tmpTable), args: [] });
    await client.execute({
      sql: `INSERT INTO ${tmpTable} SELECT * FROM ${table}`,
      args: [],
    });
    await client.execute({ sql: `DROP TABLE ${table}`, args: [] });
    await client.execute({
      sql: `ALTER TABLE ${tmpTable} RENAME TO ${table}`,
      args: [],
    });
    console.log(`[db] ${table} constraints fixed`);
  } catch (err) {
    console.error(`[db] recreateTable ${table} failed:`, err);
    try {
      await client.execute({
        sql: `DROP TABLE IF EXISTS ${table}_tmp`,
        args: [],
      });
    } catch { /* ignore */ }
  }
}

export async function runMigrations(): Promise<void> {
  if (migrated) return;
  // NOTE: migrated is set to true only AFTER successful completion to allow retries

  try {
    // Phase 1: Create tables (fresh install) or no-op (existing DB)
    await client.batch(
      CREATE_TABLES.map((sql) => ({ sql, args: [] })),
      "write"
    );
    console.log("[db] tables ok");

    // Phase 2: Add columns (existing DBs created before certain features)
    for (const t of ALTER_TABLES) {
      await addColumnIfMissing(t.table, t.column, t.def);
    }

    // Phase 3: Migrate isArchived → status (for DBs created before the status column)
    try {
      const colCheck = await client.execute({
        sql: `SELECT 1 FROM pragma_table_info('decisions') WHERE name='is_archived' LIMIT 1`,
        args: [],
      });
      if (colCheck.rows.length > 0) {
        await client.execute({
          sql: `UPDATE decisions SET status = 'ARCHIVED' WHERE is_archived = 1 AND (status = 'ACTIVE' OR status IS NULL)`,
          args: [],
        });
        console.log("[db] migrated isArchived → status");
      }
    } catch { /* is_archived column may not exist on fresh DBs */ }

    // Phase 4: Create indexes (columns guaranteed to exist now)
    await client.batch(
      CREATE_INDEXES.map((sql) => ({ sql, args: [] })),
      "write"
    );
    console.log("[db] indexes ok");

    // Phase 5: Fix unique constraints on tables created before multi-user support
    const weeklyReviewsDDL = CREATE_TABLES.find((s) => s.includes("weekly_reviews"))!;
    const monthlyPortraitsDDL = CREATE_TABLES.find((s) => s.includes("monthly_portraits"))!;
    await recreateTable("weekly_reviews", weeklyReviewsDDL);
    await recreateTable("monthly_portraits", monthlyPortraitsDDL);

    // Phase 6: Seed data
    const now = Date.now();

    await db
      .insert(schema.errorTypes)
      .values(
        PRESET_ERRORS.map((e) => ({
          id: e.id,
          name: e.name,
          description: e.description,
          isPreset: 1 as unknown as boolean,
          userId: "jiayuan",
          createdAt: now,
        }))
      )
      .onConflictDoNothing();

    const hash = await bcrypt.hash("admin123", 12);
    await db
      .insert(schema.users)
      .values({
        id: "jiayuan",
        name: "jiayuan",
        email: "admin@trademirror.com",
        role: "admin",
        disabled: false,
        passwordHash: hash,
        createdAt: now,
      })
      .onConflictDoNothing();

    await db
      .update(schema.users)
      .set({ email: "admin@trademirror.com" })
      .where(eq(schema.users.email, "jiayuan@trademirror.local"));

    console.log("[db] migrations done");
    migrated = true; // ← Set ONLY after all phases complete successfully
  } catch (err) {
    console.error("[db] migration error — will retry on next request", err);
    // migrated remains false so the next request will retry
  }
}
