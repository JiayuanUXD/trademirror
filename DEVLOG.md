# TradeMirror · 开发日志

每次开发会话的改动摘要，供跨平台切换时快速同步上下文。格式约定：每条一行，只记「做了什么」，不记实现细节。

---

## 2026-06-22

- fix: 选股漏斗 T+1/T+3/T+5 收益全为 0%（`addTradingDays` 时区 bug）
- fix: 市场情绪误将 6/22 标记为假日
- fix: 情绪趋势图切换 30/60 日时"Failed query"间歇报错（串行查询改批量）
- feat: 选股漏斗页面加载时自动回填 T+N 收盘价
- feat: 同日多次扫描只保留最后一次快照
- feat: 市场情绪页面加载时自动补齐历史缺失数据
- feat: 客户端切换 30/60 日时触发更大范围补齐，已拉取范围不重复请求
- style: 趋势图 X 轴按 tab 自适应 tick 间隔
- style: 选股漏斗 / 市场情绪页面宽度改为自适应
- refactor: 过滤漏斗从独立卡片迁移至标题旁 info 弹窗
- chore: 清理项目根目录无用文件（模板 SVG、空目录、锁文件）

---

## 2026-06-16

- feat: 月度画像增加「三笔关键交易」（成功/失败/反思各 Top 5 候选）
- feat: 情绪阶段判定阈值可在设置页自定义（8 项参数）
- feat: 选股池增加 14 日历史时间轴（含 T+N 收益）
- fix: 总仓位护栏口径改为按持仓档案合计（原按决策卡累加）
- fix: 选股漏斗 `filtered_summary` 缺少新字段导致 `toLocaleString` 崩溃

---

## 2026-06-09

- feat: 决策卡操作（加仓/卖出等）改为右侧抽屉弹出
- feat: 盘后简报分享功能（短链 + 公开页面）
- fix: 盘后简报 AI 文本清理（过滤套话 + 默认折叠）
- fix: Vercel 大盘数据加载失败（移除 Tushare 依赖）
- fix: Vercel 全站不可用（Turso AUTH_TOKEN 失效）

---

## 2026-06-08

- feat: 决策卡列表搜索（代码/名称模糊匹配）
- feat: 股票搜索本地缓存 + 拼音首字母（全量 5000+ 股离线匹配）
- fix: 股票名称空格不一致导致持仓聚合异常

---

## 2026-06-03

- feat: 决策卡日期选择器点击优化、止损价默认 8%、补全后自动跳转下一张
- fix: Vercel 环境变量名 `Gemini` → `GEMINI_API_KEY` 导致图片识别 503

---

## 2026-05-27

- fix: 补全决策卡卖出时止损校验崩溃（Zod `.positive()` → `.min(0)`）
- fix: SSE 连接竞态崩溃（controller 关闭后仍 enqueue）
- fix: API 错误返回对象导致 React 渲染崩溃（`flatten()` → `issues[0].message`）
- feat: 批量导入自动将已有持仓的 BUY 升级为 ADD

---

## 2026-05-26

- feat: 加仓/清仓时从最近操作快捷选股
- refactor: 移除 Google OAuth（大陆用户不可用）
- test: 验证 DeepSeek v4-pro 不支持图片识别

---

## 2026-05-25

- fix: 卖出操作隐藏止损字段
- feat: 批量导入 `tradedAt` 与 `createdAt` 分离
- fix: 复盘拦截时区 bug（`Date.UTC` 统一）、本周进行中不再显示「待完成」
- feat: 历史复盘删除（仅允许删除非本周）

---

## 2026-05-22

- fix: 决策表单浏览器自动填充历史值
- fix: 截图导入 fetch failed（Vercel 环境 undici 兼容性）
- fix: 批量导入后决策卡列表不显示（`createdAt` 用历史时间导致超出 limit）
- fix: 截图导入提交失败无反馈（confirm 步骤缺少错误 Banner）
- fix: 抽屉遮罩未覆盖全页（`isolation: isolate`）

---

## 2026-05-19

- feat: 截图批量导入决策卡（Vision API 识别 → 确认编辑 → 批量创建）
- feat: 图片识别增加 Gemini 支持（OpenAI / Gemini / DeepSeek 三优先级）
- fix: 代码审查 12 项修复（列表刷新、止损联动、AbortController、ARIA、状态守卫等）
- refactor: 持仓库全面重构（表格+卡片双布局、抽屉化、板块自动标注、撤退条件标签化）
- perf: 路由骨架屏 + 顶部导航进度条 + 页面入场动画
- perf: 持仓 Tab 乐观更新（12 个操作同步更新 UI）

---

## 2026-05-18

- feat: 决策卡列表改为右侧 Sheet 抽屉查看
- feat: 止损输入按比例/按价格切换
- feat: 周复盘门禁增加「补录历史」旁路
- feat: 管理员角色变更下拉 + 二次确认
- fix: 股票搜索防抖 AbortController + 网络降级 + LRU 缓存
- feat: 非理性依据增加「熟人/群友推荐」
- feat: 决策卡操作链（parentId 关联）+ 作废/归档机制
- feat: 选股后自动填入当前价格（东方财富实时行情）

---

## 2026-05-15

- feat: 用户认证系统（NextAuth v5 + JWT + 邮箱密码）
- feat: 多用户数据隔离（8 张表新增 userId）
- feat: 管理员后台（用户列表/只读数据/全局统计）
- feat: 股票代码自动补全（东方财富 suggest API）
- feat: 历史交易补录（日期时间选择器）
- deploy: 首次部署 Vercel（排障：SSH remote、私有仓库 BLOCKED、Node.js 版本）

---

## 2026-05-14

- feat: 回顾日历、智能预警 SSE、券商 CSV 导入、AI 洞察降级 UI
- style: 全面移除 Emoji → lucide-react 图标
- style: A 股红涨绿跌色彩规范（`--color-up` / `--color-down`）
- refactor: 分析页合并入首页、仪表板增加情绪基线警告/待回填提醒/纪律快照
- perf: 仪表板 Suspense 流式渲染、设置存储迁移至 DB
- fix: 危险拦截弹窗增加「先观察」按钮、FOMO vs 盈亏散点图

---

## 2026-05-13（初始提交）

MVP 上线：决策卡 · 持仓库 · 周复盘 · 月度画像 · 分析仪表板 · 错误库 · 目标管理 · 智能预警 · 计算器。技术栈：Next.js 16 + Drizzle ORM + Turso + Vercel。
