# TradeMirror · 开发日志

本文件记录每次开发会话的改动摘要，供在不同开发平台（Claude Code、Cursor、其他 AI 助手等）间切换时快速同步上下文。

**项目简介**：A股个人交易日志 Web 应用。帮用户看清自己的交易行为模式，而非预测市场。
**线上地址**：https://trademirror-sand.vercel.app
**本地开发**：`pnpm dev --port 5001`
**技术栈**：Next.js 16 App Router · TypeScript · Tailwind · Drizzle ORM · libSQL（Turso） · NextAuth v5

---

## 2026-05-18

### 决策卡查看体验优化
- **右侧抽屉查看**：决策卡列表页（`/decisions`）由"点击卡片跳转详情页"改为"点击卡片弹出右侧 Sheet 抽屉"，无需离开列表即可浏览完整信息
  - 新建 `components/decisions/decisions-list.tsx`：抽取列表渲染逻辑为 Client Component，持有 `selectedId` 状态
  - 新建 `components/decisions/decision-sheet.tsx`：右侧 Sheet 面板，并行拉取 `/api/decisions/[id]`、`/api/decisions/[id]/errors`、`/api/errors`，渲染决策详情、情绪评分、价格跟踪（DecisionTracking）、错误标记（ErrorTagger）
  - Sheet 行为：ESC 关闭、点击遮罩关闭、锁定 body 滚动；顶部"独立页面"按钮保留原有 `/decisions/[id]` 跳转
  - `app/(main)/decisions/page.tsx` 简化为纯 Server Component，数据获取后直接传入 `<DecisionsList>`

### 决策表单止损输入改版
- **按比例 / 按价格切换**（`components/decisions/decision-form.tsx` Step 3）
  - 新增 `stopLossMode`（`"pct" | "price"`）和 `stopLossPercent` 本地状态，默认"按比例"
  - 按比例模式：输入跌幅百分比（如 `8`），自动计算对应止损价 `= 入场价 × (1 - pct%)`，下方实时显示"对应止损价：¥xxx"
  - 按价格模式：保留原有绝对价格输入框
  - 两种模式最终提交字段不变（`stopLossPrice` 绝对价格）
- **提交按钮居中修复**：`记录这笔决策` 按钮加 `flex items-center justify-center gap-1.5`，图标与文字不再偏左

### 周复盘门禁优化
- `/decisions/new` 在上周复盘未完成（DRAFT 状态）时，展示两条路径：
  - 主路径（蓝色）→ 直接完成上周复盘
  - 次路径 → 进入 `?mode=backfill` 补录历史交易（显示橙色提示条，引导完成后回去复盘）

### 管理员角色管理交互优化
- 用户管理页角色变更改为"下拉选择 + 二次确认弹窗"，防止误操作
- 确认弹窗显示用户名和新角色，不允许修改自己的角色（按钮置灰 + 提示）

### P0: 股票搜索稳定性修复
- **AbortController 防抖**：`stock-combobox.tsx` 引入 AbortController，用户快速输入时取消过期请求，消除 race condition
- **网络失败降级**：fetch 失败时不再静默失败，下拉面板显示"搜索暂时不可用，请手动输入"
- **LRU 缓存**：缓存最近 10 条搜索结果，网络异常时尝试部分匹配缓存数据
- **移动端优化**：`onBlur` 加 150ms 延迟 + `suppressBlur` ref，防止移动端下拉菜单过早关闭

### P1-a: 非理性依据增加"熟人/群友推荐"
- `types/decision.ts`：`IrrationalBasis` 类型和 `IRRATIONAL_BASIS` 数组新增一项

### P1-b: 决策卡操作链 + 作废机制
- **数据模型变更**（`lib/db/schema.ts`）：
  - `isArchived: boolean` → `status: text`（ACTIVE / VOIDED / ARCHIVED）
  - 新增 `voidedReason`（nullable: INPUT_ERROR / DUPLICATE / NOT_MINE）
  - 新增 `voidedAt`（nullable timestamp）
  - 新增 `parentId`（nullable，自引用关联父卡）
- **数据迁移**（`lib/db/migrate.ts`）：自动检测旧 `is_archived` 列，`is_archived=1` → `status='ARCHIVED'`
- **作废 API**：`PATCH /api/decisions/[id]/void` — 30min 内可选原因，超时必选
- **归档 API**：`PATCH /api/decisions/[id]/archive`
- **决策列表增强**（`decisions-list.tsx`）：
  - 状态筛选 Tab（全部/活跃/已作废/已归档）
  - voided 卡灰色+删除线，archived 降低透明度
- **Sheet 操作面板**（`decision-sheet.tsx`）：
  - ACTIVE 买入卡：加仓/减仓/清仓/作废/归档 按钮组
  - ACTIVE 卖出卡：作废/归档
  - 作废确认弹窗：≤30min 一键确认，>30min 必选原因
  - VOIDED/ARCHIVED 状态横幅
- **操作链子卡**（`decision-form.tsx`）：读取 URL params（parentId/stockCode/stockName/stockMarket/action），点击"加仓/减仓/清仓"跳转表单并自动预填

### P2: 自动填入当前价格
- **新增** `app/api/stocks/price/route.ts`：调用东方财富实时行情 API，以 fen 为单位返回，转换为元
- **StockCombobox 联动**：选择股票后自动 fetch `/api/stocks/price?code=&market=`，填入价格输入框

## 2026-05-19

### 代码审查修复（12项）

根据 2026-05-18 代码审查结果，按优先级逐一修复：

**Fix #1 — 决策列表刷新机制**
- `components/decisions/decisions-list.tsx`：移除 `refreshKey` state 和 `window.location.reload()`
- 改用 `useRouter().refresh()` 触发 Next.js 增量刷新，无白屏

**Fix #4 & #11 — 止损百分比与入场价联动**
- `components/decisions/decision-form.tsx`：新增 `useEffect` 监听 `s1.price`、`stopLossMode`、`stopLossPercent`
- 入场价改变时自动重新计算止损价；切换至"按比例"模式且比例为空时清空止损价

**Fix #5 — fetchData AbortController**
- `components/decisions/decision-sheet.tsx`：`fetchData` 新增 `signal?: AbortSignal` 参数；`useEffect` 创建 `AbortController`，cleanup 时 `abort()`，防止快速切换时旧请求覆盖新数据

**Fix #7 — Sheet 加载失败反馈**
- `decision-sheet.tsx`：新增 `fetchError` state，fetch 失败时显示"加载失败，请重试"提示 + 重试按钮

**Fix #8 — Sheet ARIA 无障碍**
- `decision-sheet.tsx`：面板加 `role="dialog"` `aria-modal="true"` `aria-labelledby="decision-sheet-title"`；标题加 `id`；关闭按钮加 `aria-label="关闭"`

**Fix #2 — void API 30分钟宽限期**
- `app/api/decisions/[id]/void/route.ts`：先 `getDecisionById` 检查存在性和状态；`reason` 改为 `optional`，30min 内不填默认 `INPUT_ERROR`，超时必须提供 reason

**Fix #3 — status 状态守卫**
- `lib/db/queries/decisions.ts`：`voidDecision` 和 `archiveDecision` 的 WHERE 条件新增 `eq(decisions.status, "ACTIVE")`，防止重复 void/archive
- `app/api/decisions/[id]/archive/route.ts`：先查库，不存在返回 404，非 ACTIVE 返回 409

**Fix #6 — stocks/price 入参校验**
- `app/api/stocks/price/route.ts`：新增 `/^\d{6}$/` 正则验证 `code`；校验 market 必须为 SH/SZ/BJ

**Fix #9 — 认证守卫 redirect**
- 6 个页面将 `return null` 替换为 `redirect()`：
  - 未登录 → `redirect("/login")`：`decisions/page.tsx`、`decisions/new/page.tsx`、`decisions/[id]/page.tsx`
  - 未登录 → `redirect("/login")`，非 admin → `redirect("/")`：`admin/users/page.tsx`、`admin/users/[id]/page.tsx`、`admin/stats/page.tsx`

**Fix #10 — LRU 缓存命中时正确更新顺序**
- `components/shared/stock-combobox.tsx`：缓存命中时先 `delete` 再 `set`，确保 Map 按 LRU 排序，不再退化为 FIFO

---

## 2026-05-15

### 用户认证系统上线（Phase 1-3）
- **多用户认证**：NextAuth v5 + JWT 策略，支持邮箱密码登录和 Google OAuth
- **数据隔离**：全部 8 张业务表新增 `userId` 字段，所有查询按用户过滤
- **管理员后台**：`/admin/users`（用户列表）、`/admin/users/[id]`（只读数据查看）、`/admin/stats`（全局统计）
- **初始管理员账号**：`jiayuan@trademirror.local` / `admin123`，首次登录强制改密
- **路由重组**：页面迁移到 `app/(auth)/` 和 `app/(main)/` 路由组，middleware 统一鉴权

### 功能增强
- **股票代码自动补全**：`components/shared/stock-combobox.tsx`，接入东方财富 suggest API + 用户历史记录缓存
- **历史交易补录**：决策卡表单新增日期时间选择器，支持录入过去的交易
- **README 重写**：项目概述、技术栈、环境变量指南、目录结构、部署记录

### 代码审查与部署
- TypeScript 零错误
- 清理路由迁移遗留的 15 个旧页面文件（`app/decisions/` 等，已迁移到 `app/(main)/`）
- 补充 Vercel 环境变量 `AUTH_SECRET`（NextAuth v5 主变量名）
- 成功部署 v0.3 到 https://trademirror-sand.vercel.app

### ⚠️ 部署踩坑复盘

本次部署耗时约 40 分钟排障，记录三个独立问题，避免将来重复踩坑：

**问题 1：Git push 认证失败**
- 现象：`git push` → `fatal: could not read Username for 'https://github.com'`
- 原因：remote URL 用的是 HTTPS，macOS 终端没有 credential helper
- 解法：`git remote set-url origin git@github.com:JiayuanUXD/trademirror.git`
- ✅ 已修复：remote 已永久切换为 SSH

**问题 2：Vercel 部署永久 BLOCKED（核心问题，耗时最长）**
- 现象：`vercel deploy --prod` 只上传 2.6KB，部署状态永远卡在 BLOCKED/UNKNOWN
- 排查过程：
  1. 初以为是并发限制 → 清除了所有卡住的部署，无效
  2. 检查 Node.js 24.x 版本 → 降级到 22.x，无效
  3. 检查 Deployment Protection / project settings → 全部正常
  4. 通过 Vercel API 发现 `readyState: "BLOCKED"` 且 `link: {}` 为空（无 GitHub 集成）
  5. 检查 GitHub webhooks → 空列表，确认没有 Vercel GitHub App
- 根因：**GitHub 仓库是私有的**。Vercel CLI 创建部署时通过文件去重只上传增量（2.6KB），构建时需从 GitHub 拉取完整代码，但没有权限访问私有仓库 → 构建永远启动不了 → BLOCKED
- 解法：用户将 GitHub 仓库改为公开，部署立刻成功
- 教训：
  - Vercel 的 BLOCKED 状态没有给出任何错误信息（`errorCode: null, errorMessage: null`），排查非常困难
  - `vercel ls` 显示 "UNKNOWN" 而非 "BLOCKED"，隐藏了真实状态，需要用 API 才能看到
  - 多次重试会创建多个 BLOCKED 部署，Hobby 计划的并发限制（1 个构建）导致后续部署也被阻塞，形成恶性循环
- ✅ 预防清单：
  1. 部署前确认 GitHub 仓库权限（公开 or 已安装 Vercel GitHub App）
  2. 如果 `vercel deploy` 上传体积异常小（< 100KB），大概率是 Git 拉取问题
  3. 遇到 BLOCKED 用 `vercel inspect` 或 API 查真实状态，不要只看 `vercel ls`
  4. 不要反复重试——先 `vercel remove` 清除卡住的部署再重新来

**问题 3：Node.js 版本过新**
- 现象：Vercel 项目默认 Node.js 24.x，构建有 punycode 废弃警告
- 解法：通过 API `PATCH /v9/projects/{id}` 降级到 22.x LTS
- ✅ 预防：新项目固定用 LTS 版本（当前 22.x），不要用最新大版本

---

## 2026-05-14

### 待办清空与功能增强
- **Portraits API 修复**：解决了月度画像接口中 Zod 枚举与业务类型不一致导致的 TS 报错。
- **回顾日历 (`/calendar`)**：新增日历视图页面，按日期可视化展示每日决策频率与 FOMO 情绪分布。
- **智能预警实时推送 (SSE)**：接入 Server-Sent Events 协议，侧边栏红点现在无需刷新即可实时反映高危预警状态。
- **券商数据导入 (`/decisions/import`)**：支持解析通达信和同花顺导出的 CSV 成交对账单，大幅降低手动录入成本。
- **AI 洞察卡优化**：增加引导式降级 UI，当 `DEEPSEEK_API_KEY` 未配置时提供明确的操作指引而非简单报错。
- **计算器 Safari 兼容性修复**：Safari 的 `<button>` 不支持 `flex-col` 内子元素的点击冒泡，Tab 按钮改用 `<div role="button">` + `onKeyDown` 实现，同时保留无障碍访问支持。

### UI 规范与视觉标准化
- **全面移除 Emoji**：系统性替换了项目各模块（计算器、决策卡、持仓档案、复盘画像）中的所有 Emoji（如 ⚠, 🎯, ✅, 💡, 🔍, 📈 等），统一改用 `lucide-react` 矢量图标，提升界面专业感。
- **A 股红涨绿跌规范**：
  - 在 `globals.css` 中引入语义化变量 `--color-up` (红) 和 `--color-down` (绿) 作为色彩基准。
  - 彻底重构计算器、资产卡片、分析图表和决策列表，确保所有涉及“盈利/上涨/买入”的视觉元素为红色，涉及“亏损/下跌/卖出”的元素为绿色。
  - 区分了业务状态颜色（Success/Warning/Danger）与金融指标颜色，避免视觉冲突。
- **计算器交互优化**：统一了所有计算器页面的配色方案，将 Kelly 公式、加仓建议等模块的逻辑输出调整为符合 A 股用户直觉的配色，并修复了移动端下的交互阻碍。
- **持仓详情页标准化**：更新了持仓详情头部、Tab 切换区及操作记录列表的色彩逻辑，修正了 P&L 百分比和操作方向的色彩误导。

### 仪表板重构
- **合并分析页到首页**：`app/page.tsx` 现在同时承载原仪表板和原分析页的全部内容
- **修复侧边栏**：`components/shared/sidebar.tsx` 中"仪表板"从指向不存在的 `/dashboard` 改为 `/`，移除"分析"导航项
- **`/analytics` 重定向到 `/`**，原 URL 不会 404
- **新增三个功能模块**（均在 `app/page.tsx`）：
  - **情绪基线警告**：近 7 天 FOMO 均值 ≥ 6 时在页面顶部显示橙/红色提示条
  - **待回填价格提醒**：自动列出 7/30 天前未填后续价格的决策卡，点击直达（FOMO vs 盈亏散点图需要这些数据才有意义）
  - **本周纪律快照**：实时展示本周操作次数是否达标、有无高危交易、持仓档案状态
- **全宽布局**：移除所有页面的 `max-w-*` 和 `mx-auto` 约束，内容区撑满容器

### 性能与持久化优化
- **仪表板 (Dashboard) 异步流式渲染**：重构 `app/page.tsx` 引入 React Suspense，配合 `DashboardSkeleton` 骨架屏，解决 500+ 条数据加载导致的页面首屏阻塞（TTFB 显著降低）。
- **设置 (Settings) 存储迁移**：将用户偏好从浏览器 `localStorage` 迁移至本地 SQLite 数据库（新增 `settings` 表），彻底解决服务端渲染时的“水合闪烁” (Hydration Flash)。
- **设置页服务端化**：重构 `app/settings/page.tsx` 为 Server Component，配合 Server Actions 实现零延迟加载与自动持久化。
- **计算器页面修复**：解决 `app/calculators/page.tsx` 中由于 JSX 预求值导致的 Tab 切换卡顿/失效问题，改为标准的条件渲染并修复了 z-index 遮挡隐患。

### P0 问题修复（同一会话较早时完成）
- **`components/decisions/danger-dialog.tsx`**：为 CALM_LOW（平静度 ≤ 4）拦截新增第三个按钮「先观察，明天再决定」
- **`components/decisions/decision-form.tsx`**：点击"先观察"后关闭弹窗，顶部显示蓝色提示条提醒用户已暂缓
- **FOMO vs 盈亏散点图**：
  - `lib/analytics/index.ts` 新增 `FomoVsReturnItem` 类型和 `getFomoVsReturn()` 函数
  - `components/analytics/charts.tsx` 新增 `FomoScatterChart`（Recharts ScatterChart，FOMO≥7 红色，参考线 y=0 和 x=7）
  - `components/analytics/charts-client.tsx` 和 `app/analytics/page.tsx` 接入

### 侧边栏重组与 UI 抛光（同日稍晚）
- **日历页独立**：`components/shared/sidebar.tsx` 中移除"仪表板"的二级子菜单（实时概览/回顾日历/新建），"回顾日历"提升为一级导航项（`/calendar`，Calendar 图标），清除相关 children 类型、hasChildren 变量、ChevronRight/Plus 导入
- **设置页修复**：`lib/db/migrate.ts` DDL 列表中补上 `settings` 表的 CREATE TABLE 语句，修复冷启动后 `/settings` 500 报错（`SQLite error: no such table: settings`）
- **全局主题深化**：`app/globals.css` 中所有 surface 层级加深（`surface-base` #0B0F15 / `surface-card` #141B28 / `surface-sidebar` #0F1520），新增 `card-surface` 类（box-shadow + backdrop-blur），`card-interactive` 增强 hover 时的阴影投射和微上移动画（translateY -1px），新增 `nav-item` 过渡类
- **卡片视觉统一**：`app/page.tsx`（统计/情绪/纪律/待回填/空状态卡片）、`components/analytics/charts-client.tsx`（ChartCard/骨架屏）、`components/analytics/insight-card.tsx`、`app/settings/settings-form.tsx`（Section 组件）全部替换为 `card-surface` 类，卡片内边距与间距调整
- **顶栏与侧边栏细节**：Navbar 加底部微阴影，侧边栏活跃项加蓝色光晕边框（`shadow-[0_0_0_1px_rgba(61,142,248,0.2)]`），导航间距从 `space-y-0.5` 加大到 `space-y-1`，底栏 Discord 链接替换为版本号

---

## 2026-05-13（初始提交）

### 基础架构搭建
- 项目从 `better-sqlite3`（本地文件）迁移到 `@libsql/client` + Turso（云端 SQLite），以兼容 Vercel Serverless 部署
- `lib/db/index.ts`：改用 `createClient({ url, authToken })` 初始化，支持 `TURSO_DATABASE_URL` 和 `TURSO_AUTH_TOKEN` 环境变量；本地回退到 `file:local.db`
- `instrumentation.ts`：Next.js 启动钩子，执行异步 DDL + 预设错误类型 seed
- `drizzle.config.ts`：配置 Turso 方言用于 `drizzle-kit push`
- 部署到 Vercel：`https://trademirror-sand.vercel.app`

### 已完成的核心模块（MVP）

**① 决策卡（`app/decisions/`）**
- 三屏表单：基础信息 → 决策依据 + 情绪评分 → 风控
- 6 类理性依据 + 4 类非理性依据（多选）
- 三维情绪评分（平静度 / 信心度 / FOMO，滑块 1–10）
- 危险信号自动计算：FOMO≥7 / 平静度≤4 / 不符合体系 / 非理性依据
- 软拦截弹窗（`components/decisions/danger-dialog.tsx`）展示用户自身历史数据
- 不允许删除，只能归档

**② 持仓库（`app/holdings/`）**
- 单股档案：持有逻辑 / 持有前提 / 撤退条件 / 操作记录 / 新闻追踪（5 个 Tab）
- 逻辑评分 0–10（自动计算）
- 健康分 0–100

**③ 周复盘（`app/reviews/`）**
- 自动汇总本周决策数据
- 三问必填（最对 / 最错 / 重来一次）
- 纪律分 7 项（满分 14）
- 系统自动评分部分可量化项目

**④ 月度画像（`app/portraits/`）**
- 月度数据卡
- 三笔关键交易（最成功 / 最失败 / 最反思）
- 核心问题对照表（6 大散户通病逐月评估）
- 月度体悟 + 下月单项改进重点

**⑤ 分析仪表板（现已合并入首页 `/`）**
- 7 张图表：决策依据分布 / FOMO 分布 / 高危信号 / 操作方向饼图 / 每周趋势 / 纪律分趋势 / FOMO vs 30日盈亏散点
- AI 行为洞察卡（DeepSeek API，需配置 `DEEPSEEK_API_KEY`）

**⑥ 错误库（`app/errors/`）**
- 预置 8 类错误类型 + 自定义
- 按"累计代价"排序，显示发生次数和趋势

**⑦ 目标管理（`app/goals/`）**
- 现实性评分向导
- 月度进度追踪

**⑧ 智能预警（`app/alerts/`）**
- 行为预警 / 情绪预警 / 条件单触发

**⑨ 计算器（`app/calculators/`）**
- 仓位 / 止损 / 凯利 / 复利 / 税费

### 数据库 Schema 关键字段
- `decisions`：完整决策卡字段包含 `priceAfter7Days`、`priceAfter30Days`、`return30Days`
- `holdings`：`status`（HOLDING/WATCHING/CLOSED）、`healthScore`
- `reviews`：`weekStart`、`disciplineTotal`、`status`（DRAFT/COMPLETED）
- `portraits`：按月聚合
- `error_types`：预置 + 用户自定义

---

## 待办 / 已知问题

- [x] `app/api/portraits/[id]/route.ts:38` 有 TypeScript 类型不匹配（已修复，统一使用 shared constants）
- [x] 侧边栏宽屏展开后"仪表板"子菜单（概览/日历）的子路由（已实现，新增 `/calendar` 页面）
- [x] 智能预警的实时推送（已接入 SSE 实时更新）
- [x] 券商数据导入（已实现通达信/同花顺 CSV 导入基础逻辑）
- [x] `DEEPSEEK_API_KEY` 未配置时 AI 洞察卡功能降级优化（已增加引导式提示 UI）

