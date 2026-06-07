// One-off seed script: populates demo data for user "jiayuan".
// Run: node lib/db/seed-demo.cjs
const { createClient } = require("@libsql/client/node");

const url = process.env.TURSO_DATABASE_URL || "file:local.db";
const authToken = process.env.TURSO_AUTH_TOKEN;
const c = createClient({ url, authToken });

const USER = "jiayuan";
const now = Date.now();
const day = 24 * 60 * 60 * 1000;

function uid(prefix) {
  return prefix + "_" + Math.random().toString(36).slice(2, 10);
}

async function main() {
  // ── Settings ────────────────────────────────────────────────
  await c.execute({
    sql: `INSERT INTO settings (id, display_name, max_position_pct, weekly_trade_limit, default_stop_loss_pct, total_capital, user_id)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [uid("set"), "佳源", 25, 2, 10, 500000, USER],
  });

  // ── Holdings ────────────────────────────────────────────────
  const holdings = [
    {
      code: "600519", name: "贵州茅台", market: "SH", status: "HOLDING",
      cost: 1620.5, current: 1758.0, shares: 100, sector: "白酒",
      logic: "高端白酒龙头，品牌护城河深厚，现金流稳定，长期持有逻辑清晰。",
      pre: "估值回落至历史中枢以下，PE < 30。",
      exit: "基本面恶化或 PE 显著高于 40 时减仓。",
    },
    {
      code: "300750", name: "宁德时代", market: "SZ", status: "HOLDING",
      cost: 185.3, current: 172.6, shares: 500, sector: "新能源",
      logic: "动力电池全球龙头，受益于电动车长期渗透率提升。",
      pre: "行业产能出清，毛利率企稳回升。",
      exit: "市占率持续下滑或被新技术替代。",
    },
    {
      code: "601318", name: "中国平安", market: "SH", status: "WATCHING",
      cost: 0, current: 48.2, shares: 0, sector: "金融保险",
      logic: "保险估值处于低位，寿险改革有望见效，等待右侧确认。",
      pre: "新业务价值同比转正。",
      exit: "—",
    },
    {
      code: "000858", name: "五粮液", market: "SZ", status: "CLOSED",
      cost: 142.0, current: 158.4, shares: 0, sector: "白酒",
      logic: "次高端白酒，已按计划止盈了结。",
      pre: "—",
      exit: "达到目标价位 158 已清仓。",
    },
  ];
  for (const h of holdings) {
    await c.execute({
      sql: `INSERT INTO holdings (id, stock_code, stock_name, stock_market, status, cost_price, current_price, shares, sector, logic, prerequisites, exit_conditions, created_at, updated_at, user_id)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      args: [uid("hold"), h.code, h.name, h.market, h.status, h.cost, h.current, h.shares, h.sector, h.logic, h.pre, h.exit, now - 30 * day, now, USER],
    });
  }

  // ── Decisions ───────────────────────────────────────────────
  const decisions = [
    {
      code: "600519", name: "贵州茅台", market: "SH", action: "BUY",
      price: 1620.5, qty: 100, reason: "估值回落到合理区间，分批建仓第一笔。",
      basis: "PE 28，处于近五年低位，基本面无变化。",
      align: "ALIGN", calm: 8, conf: 7, fomo: 2,
      stop: 1450, maxLoss: 17050, signals: "[]", traded: now - 28 * day,
    },
    {
      code: "300750", name: "宁德时代", market: "SZ", action: "BUY",
      price: 185.3, qty: 500, reason: "行业景气度回升，建立底仓。",
      basis: "Q3 出货量超预期，毛利率环比改善。",
      align: "PARTIAL", calm: 6, conf: 6, fomo: 4,
      stop: 165, maxLoss: 10150, signals: "[\"板块情绪偏热\"]", traded: now - 20 * day,
    },
    {
      code: "000858", name: "五粮液", market: "SZ", action: "CLEAR",
      price: 158.4, qty: 300, reason: "达到目标价，纪律性止盈。",
      basis: "已到预设目标位 158，兑现利润。",
      align: "ALIGN", calm: 9, conf: 8, fomo: 1,
      stop: 130, maxLoss: 0, signals: "[]", traded: now - 5 * day,
    },
  ];
  for (const d of decisions) {
    await c.execute({
      sql: `INSERT INTO decisions (id, stock_code, stock_name, stock_market, action, price, quantity, amount, reason, basis, system_alignment, calm_score, confidence_score, fomo_score, stop_loss_price, max_acceptable_loss, danger_signals, status, incomplete, traded_at, created_at, user_id)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      args: [uid("dec"), d.code, d.name, d.market, d.action, d.price, d.qty, d.price * d.qty, d.reason, d.basis, d.align, d.calm, d.conf, d.fomo, d.stop, d.maxLoss, d.signals, "ACTIVE", 0, d.traded, d.traded, USER],
    });
  }

  // ── Goals ───────────────────────────────────────────────────
  await c.execute({
    sql: `INSERT INTO goals (id, title, start_amount, target_amount, years, required_return, realism_score, status, note, checkins, created_at, target_date, user_id)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    args: [uid("goal"), "五年实现资产翻倍", 500000, 1000000, 5, 14.87, 75, "ACTIVE", "稳健复利，控制回撤优先于追求高收益。", "[]", now - 60 * day, now + 5 * 365 * day, USER],
  });

  // ── Weekly Review ───────────────────────────────────────────
  const weekStart = now - 7 * day;
  await c.execute({
    sql: `INSERT INTO weekly_reviews (id, week_start, week_end, status, best_thing, worst_thing, do_over, discipline_items, discipline_total, created_at, completed_at, user_id)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
    args: [uid("wk"), weekStart, now, "COMPLETED", "五粮液到价果断止盈，没有贪心。", "宁德时代建仓时有点追情绪，FOMO 偏高。", "建仓前再多等一个确认信号。", JSON.stringify([{ label: "未追高", done: true }, { label: "执行止损", done: true }, { label: "控制交易次数", done: true }]), 3, weekStart, now, USER],
  });

  // ── Error Logs ──────────────────────────────────────────────
  await c.execute({
    sql: `INSERT INTO error_logs (id, error_type_id, note, cost, occurred_at, user_id)
          VALUES (?,?,?,?,?,?)`,
    args: [uid("err"), "preset_chasing", "宁德时代建仓追了情绪，买点略高。", 2000, now - 20 * day, USER],
  });

  console.log("✅ Demo data seeded for user", USER);
  process.exit(0);
}

main().catch((e) => {
  console.error("Seed failed:", e.message);
  process.exit(1);
});
