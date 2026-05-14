# TradeMirror · 开发日志

本文件记录每次开发会话的改动摘要，供在不同开发平台（Claude Code、Cursor、其他 AI 助手等）间切换时快速同步上下文。

**项目简介**：A股个人交易日志 Web 应用。帮用户看清自己的交易行为模式，而非预测市场。
**线上地址**：https://trademirror-sand.vercel.app
**本地开发**：`pnpm dev --port 5001`
**技术栈**：Next.js 14 App Router · TypeScript · Tailwind · Drizzle ORM · libSQL（Turso）

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

