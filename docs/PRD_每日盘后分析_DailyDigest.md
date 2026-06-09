# 每日盘后分析（Daily Digest）· 产品需求文档

| 项目 | 内容 |
|---|---|
| 功能名称 | 每日盘后分析（Daily Digest） |
| 文档版本 | v1.0 |
| 编写日期 | 2026-06-09 |
| 所属模块 | 持仓库 → 智能分析 |
| 依赖 | DeepSeek API、Tushare Pro API、新闻/公告数据源 |
| 优先级 | P1（高频使用场景，每个交易日触发） |

---

## 一、功能定位

### 1.1 一句话描述

> 每个交易日收盘后，自动对用户持仓股票进行技术面 + 消息面综合分析，生成"今日盘后简报"和"明日操作建议"。

### 1.2 为什么做这个功能

TradeMirror 的核心是"帮用户看清自己"。当前产品覆盖了交易前（决策卡）、交易后（周复盘、月度画像）的行为记录，但缺少**盘后即时复盘**这一环节。

用户阿强的典型痛点：
- 收盘后凭感觉判断"今天还行"或"今天不行"，缺乏客观技术分析
- 不会系统性看 MACD/KDJ/BOLL 等指标，或者看了但不知道怎么综合判断
- 第二天开盘前没有清晰的操作预案，容易被盘中情绪裹挟

### 1.3 不做什么（红线）

| 红线 | 原因 |
|---|---|
| **不提供具体买卖点位** | 避免"投顾"嫌疑，只提供分析框架和观察结论 |
| **不自动执行交易** | 项目宪章明确"不连接券商交易接口" |
| **不做盘中实时推送** | MVP 阶段只做收盘后分析，避免干扰用户交易 |
| **不替代用户判断** | 建议措辞为"观察到…""值得关注…"，而非"应该买/卖" |

---

## 二、用户场景

### 场景1：收盘后快速了解持仓情况（高频）

> 下午3点收盘，阿强打开 TradeMirror，看到持仓库首页出现"今日盘后简报"卡片。点击展开，看到每只持仓股的技术面总结（量价、MACD、KDJ、BOLL 状态）、相关消息摘要、以及一个综合评级（偏多/中性/偏空）。

### 场景2：准备明日操作预案（中频）

> 阿强看完简报，滚动到底部的"明日关注"区域。系统根据技术面和消息面给出观察建议："通信ETF 量能萎缩+MACD 死叉，关注是否跌破支撑位 X.XX""中国巨石 放量突破前高，可关注回踩确认"。阿强据此在脑中形成明天的操作预案。

### 场景3：回顾历史分析准确度（低频）

> 周末复盘时，阿强翻看本周5天的盘后分析，对比实际走势，评估分析的参考价值。系统不做自动评分，但提供历史分析列表供用户自行回顾。

---

## 三、功能设计

### 3.1 数据获取

#### 3.1.1 行情数据（技术分析原材料）

**数据源：Tushare Pro**（HTTP API `api.tushare.pro`，已验证可用）

环境变量：`TUSHARE_API_TOKEN`

| 数据项 | Tushare 接口 | 字段 | 说明 |
|---|---|---|---|
| 日K线（OHLCV） | `daily` | ts_code, trade_date, open, high, low, close, vol, amount, pct_chg | 至少取最近 60 个交易日 |
| 每日基本面 | `daily_basic` | turnover_rate, pe, pb, total_mv, circ_mv | 换手率、市值等辅助数据 |
| 大盘指数 | `index_daily` | 同 daily，ts_code 用 000001.SH / 399001.SZ / 399006.SZ | 三大指数行情 |
| 交易日历 | `trade_cal` | cal_date, is_open | 精确判定交易日（含节假日） |

**Tushare 优势（vs Sina Finance）**：
- 结构化 JSON 返回，无需解析半结构化文本
- 内置涨跌幅（`pct_chg`）、换手率（`turnover_rate`）、市值等衍生字段
- 交易日历接口（`trade_cal`）可精确判断交易日，无需维护节假日列表
- 稳定的商业 API，不存在反爬风险

**调用示例**：
```bash
POST http://api.tushare.pro
{
  "api_name": "daily",
  "token": "${TUSHARE_API_TOKEN}",
  "params": { "ts_code": "600176.SH", "start_date": "20260301", "end_date": "20260609" },
  "fields": "ts_code,trade_date,open,high,low,close,vol,amount,pct_chg"
}
# 返回 { code: 0, data: { fields: [...], items: [[...], ...] } }
```

**代码映射**：Tushare 用 `600176.SH` 格式，项目用 `stockCode=600176` + `stockMarket=SH`。转换函数：
```typescript
function toTushareCode(stockCode: string, market: "SH" | "SZ" | "BJ"): string {
  return `${stockCode}.${market}`;
}
```

#### 3.1.2 消息数据

| 数据项 | 来源 | 说明 |
|---|---|---|
| 个股新闻 | Tushare `news`（需验证积分权限） | 当日相关新闻标题 |
| 大盘要闻 | Tushare `major_news` | 影响市场的宏观/政策消息 |
| 公司公告 | 巨潮资讯网（备选） | Tushare 新闻不足时的补充 |

**MVP 策略**：消息数据获取取决于 Tushare 积分等级（新闻接口测试返回为空，可能需要更高积分）。分级策略：
- **P0（必须有）**：技术分析（纯行情数据计算，Tushare `daily` + `daily_basic` + `index_daily` 已验证可用）
- **P1（尽量有）**：新闻/公告（Tushare `news` / `major_news`，积分不够则跳过）
- **P2（锦上添花）**：外部新闻源补充（巨潮资讯、东方财富爬虫等）

### 3.2 技术指标计算

所有指标在服务端计算，不依赖第三方指标库。

| 指标 | 参数 | 分析维度 |
|---|---|---|
| **量价关系** | 当日成交量 vs MA5/MA20 量 | 放量/缩量、量价背离 |
| **均线系统** | MA5, MA10, MA20, MA60 | 多头/空头排列、金叉/死叉、支撑/压力 |
| **MACD** | (12, 26, 9) | DIF/DEA 金叉死叉、红绿柱变化、顶底背离 |
| **KDJ** | (9, 3, 3) | 超买(>80)/超卖(<20)、金叉死叉 |
| **BOLL** | (20, 2) | 突破上轨/跌破下轨、缩口/开口、走势位置 |
| **RSI** | (6, 12, 24) | 超买(>70)/超卖(<30)、背离 |
| **换手率** | 当日成交量/流通股本 | 活跃度判断 |

#### 计算模块设计

```typescript
// lib/technical/indicators.ts
type OHLCV = { day: string; open: number; high: number; low: number; close: number; volume: number };

type TechnicalResult = {
  ma: { ma5: number; ma10: number; ma20: number; ma60: number };
  macd: { dif: number; dea: number; histogram: number; signal: "golden_cross" | "death_cross" | "none" };
  kdj: { k: number; d: number; j: number; signal: "overbought" | "oversold" | "golden_cross" | "death_cross" | "none" };
  boll: { upper: number; middle: number; lower: number; position: "above_upper" | "near_upper" | "middle" | "near_lower" | "below_lower" };
  rsi: { rsi6: number; rsi12: number; rsi24: number };
  volume: { ratio: number; trend: "heavy" | "normal" | "light"; vs_ma5: number; vs_ma20: number };
};

function computeIndicators(klines: OHLCV[]): TechnicalResult;
```

### 3.3 AI 分析生成

#### Prompt 设计

将技术指标计算结果 + 消息摘要喂给 DeepSeek，生成结构化的中文分析报告。

```
你是一个A股技术分析助手。请根据以下数据，为用户生成一份简明的盘后分析报告。

【重要约束】
- 你是分析工具，不是投资顾问。使用"观察到""值得关注""技术面显示"等客观措辞
- 不要给出具体买卖建议或目标价位
- 不要使用"建议买入/卖出"等投顾用语
- 每只股票的分析控制在 100-150 字

【个股数据：{stockName}({stockCode})】
- 今日：开{open} 高{high} 低{low} 收{close}，涨跌{changePct}%
- 成交量：{volume}手，vs MA5 {volRatioMa5}倍，vs MA20 {volRatioMa20}倍
- 均线：MA5={ma5} MA10={ma10} MA20={ma20} MA60={ma60}
- MACD：DIF={dif} DEA={dea} 柱={histogram}，{macdSignal}
- KDJ：K={k} D={d} J={j}，{kdjSignal}
- BOLL：上轨={upper} 中轨={middle} 下轨={lower}，当前位置={bollPosition}
- RSI：RSI6={rsi6} RSI12={rsi12} RSI24={rsi24}

【大盘环境】
- 上证：{shIndex} {shChange}% | 深证：{szIndex} {szChange}% | 创业板：{cyIndex} {cyChange}%
- 市场情绪：{marketSentiment}

【相关消息】（如有）
{newsItems}

【输出格式】
对每只股票输出：
1. 技术面总结（量价、趋势、关键指标信号）
2. 消息面影响（如有）
3. 综合评级：偏多 / 中性 / 偏空
4. 明日关注点（关键价位、可能的走势情景）
```

#### Token 预算

| 场景 | 输入 Token | 输出 Token | 估算成本（DeepSeek） |
|---|---|---|---|
| 3只持仓 | ~1500 | ~800 | ~¥0.002 |
| 5只持仓 | ~2500 | ~1200 | ~¥0.004 |
| 10只持仓 | ~5000 | ~2500 | ~¥0.008 |

成本极低，每天分析一次完全可接受。

### 3.4 数据存储

新增 `daily_digests` 表：

```sql
CREATE TABLE daily_digests (
  id TEXT PRIMARY KEY,
  trade_date TEXT NOT NULL,          -- '2026-06-09'
  user_id TEXT NOT NULL,
  -- 原始数据（JSON）
  market_data TEXT NOT NULL,         -- 大盘指数数据
  stock_analyses TEXT NOT NULL,      -- [{stockCode, indicators, news, ...}]
  -- AI 生成结果
  digest_text TEXT NOT NULL,         -- AI 生成的完整分析文本
  -- 元数据
  generated_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  UNIQUE(trade_date, user_id)
);
```

### 3.5 UI 设计

#### 3.5.1 入口

**持仓库页面**顶部新增"今日盘后简报"卡片（仅交易日 15:30 后显示，非交易日显示最近一个交易日的）。

#### 3.5.2 简报卡片（折叠态）

```
┌─────────────────────────────────────────┐
│ 📊 盘后简报 · 2026-06-09（周一）          │
│                                          │
│ 大盘：上证 ▲0.82%  深证 ▲1.15%  创业板 ▲1.63% │
│ 持仓 5 只：偏多 2 · 中性 2 · 偏空 1       │
│                                          │
│                        [查看详情 →]       │
└─────────────────────────────────────────┘
```

#### 3.5.3 详情页面（`/holdings/digest/[date]`）

```
┌─────────────────────────────────────────┐
│ ← 返回持仓库                             │
│                                          │
│ 盘后简报 · 2026-06-09                    │
│                                          │
│ ┌─ 市场概况 ──────────────────────────┐  │
│ │ 上证 3280.15 ▲0.82%               │  │
│ │ 深证 10520.30 ▲1.15%              │  │
│ │ 创业板 2150.88 ▲1.63%             │  │
│ │ 市场情绪：偏暖，两市成交1.2万亿    │  │
│ └────────────────────────────────────┘  │
│                                          │
│ ┌─ 中国巨石 600176 ── 偏多 🔴 ────────┐  │
│ │ 收盘 15.82 ▲2.33%  量比1.8x        │  │
│ │                                      │  │
│ │ 技术面：放量突破MA20压力位，MACD     │  │
│ │ 即将金叉，KDJ低位上行。BOLL中轨     │  │
│ │ 获得支撑，短期趋势转强。             │  │
│ │                                      │  │
│ │ 消息面：公司发布半年报预增公告，     │  │
│ │ 预计净利润增长30%-50%。              │  │
│ │                                      │  │
│ │ 明日关注：关注15.50回踩支撑是否      │  │
│ │ 有效，若缩量回踩不破则趋势延续。     │  │
│ └────────────────────────────────────┘  │
│                                          │
│ ┌─ 通信ETF 515880 ── 偏空 🟢 ─────────┐  │
│ │ ...                                  │  │
│ └────────────────────────────────────┘  │
│                                          │
│ ⚠️ 以上分析基于技术指标和公开信息自动     │
│ 生成，仅供参考，不构成投资建议。          │
│                                          │
│ ┌─ 历史简报 ──────────────────────────┐  │
│ │ 06-06（五）· 06-05（四）· 06-04（三）│  │
│ └────────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

### 3.6 触发机制

| 触发方式 | 说明 |
|---|---|
| **自动生成** | 交易日 15:30 后，用户首次访问持仓库时触发生成（懒加载） |
| **手动刷新** | 详情页提供"重新生成"按钮 |
| **后台定时**（P2） | 未来可接入 Vercel Cron 在 15:35 自动为活跃用户生成 |

MVP 用懒加载：用户打开持仓库 → 检查当日是否有 digest → 没有则后台生成 → 生成完成后显示。

---

## 四、执行计划

### Phase 0：技术指标计算引擎（2天）

**目标**：纯计算模块，无 UI、无 AI，可独立测试。

| 步骤 | 文件 | 说明 |
|---|---|---|
| 0.1 | `lib/technical/kline.ts` | K线数据获取：封装 Sina Finance 日K线 API，返回标准 OHLCV 数组 |
| 0.2 | `lib/technical/indicators.ts` | 技术指标计算：MA、MACD、KDJ、BOLL、RSI、量比。纯函数，输入 OHLCV[] 输出 TechnicalResult |
| 0.3 | `lib/technical/signals.ts` | 信号判定：将数值指标转化为文字信号（金叉/死叉、超买/超卖、支撑/压力等） |
| 0.4 | `lib/technical/__tests__/` | 单元测试：用已知K线数据验证指标计算正确性（至少覆盖 MACD、KDJ、BOLL） |

**验收标准**：给定一组真实K线数据，计算出的 MACD/KDJ/BOLL 值与同花顺/通达信一致（误差 < 0.5%）。

### Phase 1：Tushare 封装 + 大盘 + 交易日历（1天）

| 步骤 | 文件 | 说明 |
|---|---|---|
| 1.1 | `lib/technical/tushare.ts` | Tushare HTTP API 通用封装：callTushare 泛型函数，处理 token、错误码、字段映射 |
| 1.2 | `lib/technical/kline.ts` 重构 | 改用 Tushare `daily` 接口获取K线，`daily_basic` 获取换手率/市值 |
| 1.3 | `lib/technical/market.ts` | 大盘数据：Tushare `index_daily` 获取三大指数行情 |
| 1.4 | `lib/technical/trading-calendar.ts` | 交易日历：Tushare `trade_cal` + 内存缓存（月级别） |
| 1.5 | `lib/technical/news.ts` | 消息获取（P1）：尝试 Tushare `news`/`major_news`，积分不足时优雅降级 |

**验收标准**：Tushare 封装能稳定返回指定股票的60日K线、三大指数数据、精确交易日历。

### Phase 2：AI 分析生成（1天）

| 步骤 | 文件 | 说明 |
|---|---|---|
| 2.1 | `lib/digest/prompt.ts` | Prompt 构建：将技术指标 + 消息数据组装为结构化 prompt |
| 2.2 | `lib/digest/generate.ts` | 生成逻辑：调用 DeepSeek API，流式返回分析文本 |
| 2.3 | DB migration | 新增 `daily_digests` 表 |
| 2.4 | `lib/db/queries/digests.ts` | 查询函数：getDigestByDate、saveDigest、listRecentDigests |
| 2.5 | `app/api/digest/route.ts` | API Route：GET 获取/触发生成，返回流式文本或已缓存结果 |

**验收标准**：对3只持仓股调用接口，5秒内开始流式返回分析文本，内容覆盖技术面+综合评级。

### Phase 3：前端 UI（1.5天）

| 步骤 | 文件 | 说明 |
|---|---|---|
| 3.1 | `components/holdings/digest-summary-card.tsx` | 持仓库顶部的折叠式简报卡片（Client Component） |
| 3.2 | `app/(main)/holdings/digest/[date]/page.tsx` | 简报详情页 |
| 3.3 | `components/holdings/digest-stock-card.tsx` | 单只股票的分析卡片（技术面 + 消息面 + 评级 + 关注点） |
| 3.4 | `components/holdings/digest-market-card.tsx` | 市场概况卡片 |
| 3.5 | `components/holdings/digest-history.tsx` | 历史简报列表 |
| 3.6 | 更新 `holdings-list.tsx` | 在持仓列表顶部插入简报卡片入口 |

**验收标准**：移动端友好，简报卡片在持仓库页面正确展示，点击可跳转详情页，流式文本实时渲染。

### Phase 4：打磨与边界处理（0.5天）

| 步骤 | 说明 |
|---|---|
| 4.1 | 非交易日处理：周末/节假日显示最近交易日的分析 |
| 4.2 | 错误兜底：K线获取失败时显示"数据暂不可用"，AI 生成失败时显示原始指标数据 |
| 4.3 | 加载态：生成中显示骨架屏 + 进度提示"正在分析 X 只持仓..." |
| 4.4 | 免责声明：页面底部固定显示"以上分析基于技术指标和公开信息自动生成，仅供参考，不构成投资建议" |
| 4.5 | DeepSeek 未配置时：降级为纯技术指标展示（无 AI 文字分析） |

---

## 五、技术方案细节

### 5.1 交易日判定

直接用 Tushare `trade_cal` 接口，精确到每一天（含法定节假日、调休）：

```typescript
// lib/technical/trading-calendar.ts
// 调用 Tushare trade_cal 获取指定区间的交易日历
// 缓存策略：每月初拉一次当月+下月日历，存 Map<string, boolean>
async function isTradingDay(date: string): Promise<boolean>;  // date: 'YYYYMMDD'
async function getLastTradingDay(): Promise<string>;           // 返回 'YYYYMMDD'
```

不再需要手动维护节假日列表。

### 5.2 K线数据缓存

- 日K线数据当日内不变（收盘后固定），可按 `stockCode + date` 缓存
- 存储在 `daily_digests.stock_analyses` JSON 字段中
- 不单独建表，跟着 digest 一起存，减少复杂度

### 5.3 Tushare API 封装

```typescript
// lib/technical/tushare.ts
const TUSHARE_URL = "http://api.tushare.pro";

type TushareRequest = {
  api_name: string;
  token: string;
  params: Record<string, string | number>;
  fields?: string;
};

type TushareResponse<T> = {
  code: number;
  msg: string;
  data: { fields: string[]; items: T[][] };
};

// 通用调用函数
async function callTushare<T>(apiName: string, params: Record<string, string | number>, fields?: string): Promise<T[]>;

// 封装好的高阶函数
async function getDailyKline(tsCode: string, startDate: string, endDate: string): Promise<OHLCV[]>;
async function getIndexDaily(tsCode: string, startDate: string, endDate: string): Promise<IndexData[]>;
async function getDailyBasic(tsCode: string, tradeDate: string): Promise<DailyBasic>;
async function getTradeCal(startDate: string, endDate: string): Promise<Map<string, boolean>>;
```

**Tushare 编码规则**：`{6位代码}.{市场}` → `600176.SH`、`000001.SZ`、`515880.SH`（ETF）

### 5.4 技术指标公式参考

**MACD (12, 26, 9)**
```
EMA12 = 前日EMA12 × 11/13 + 今收 × 2/13
EMA26 = 前日EMA26 × 25/27 + 今收 × 2/27
DIF = EMA12 - EMA26
DEA = 前日DEA × 8/10 + DIF × 2/10
MACD柱 = (DIF - DEA) × 2
```

**KDJ (9, 3, 3)**
```
RSV = (收盘价 - 9日最低价) / (9日最高价 - 9日最低价) × 100
K = 前日K × 2/3 + RSV × 1/3
D = 前日D × 2/3 + K × 1/3
J = 3K - 2D
```

**BOLL (20, 2)**
```
中轨 = MA20
标准差 = std(最近20日收盘价)
上轨 = 中轨 + 2 × 标准差
下轨 = 中轨 - 2 × 标准差
```

---

## 六、风险与对策

| 风险 | 概率 | 影响 | 对策 |
|---|---|---|---|
| Tushare 积分不足/接口受限 | 低 | 中 | 当前 token 已验证 daily/index_daily/daily_basic/trade_cal 均可用，备选 Sina Finance |
| DeepSeek API 响应慢或不可用 | 低 | 中 | 降级为纯指标展示模式 |
| 新闻数据源反爬 | 高 | 低 | MVP 阶段新闻为可选项，公告优先 |
| 技术指标计算误差 | 低 | 中 | 用真实数据与同花顺对照验证 |
| 用户对 AI 分析过度依赖 | 中 | 高 | UI 上强化免责声明，措辞避免指导性 |
| 节假日误判 | 极低 | 低 | Tushare `trade_cal` 提供精确交易日历，无需手动维护 |

---

## 七、未来迭代方向（不在 MVP 范围）

| 方向 | 说明 |
|---|---|
| 盘中实时预警 | 当技术指标触发关键信号时推送通知 |
| 分析准确度追踪 | 对比"昨日建议"与"今日实际"，计算参考价值 |
| 自定义指标 | 用户可选择关注哪些技术指标 |
| 板块轮动分析 | 分析持仓股所属板块的资金流向 |
| 接入更多数据源 | 龙虎榜、融资融券、北向资金等 |
| Vercel Cron 定时生成 | 15:35 自动生成，用户打开即可看到 |
| 语音播报 | TTS 朗读盘后简报（通勤场景） |
