# TradeMirror · 项目宪章

## 项目背景

TradeMirror（交易之镜）是一个面向中国A股个人投资者的交易日志Web应用。
核心定位：**不帮用户预测市场，帮用户看清自己**。

完整产品需求见 `PRD_交易日志Web应用_TradeMirror.md`，开发历史见 `DEVLOG.md`。

## 用户画像

主要用户：38岁IT工程师，本金80-150万，6年A股投资，情绪化交易困扰严重。
他不需要又一个炒股软件，他需要一面照见自己交易模式的镜子。

## 核心原则（最重要的5条）

1. **简单胜过复杂**：MVP阶段不引入任何不必要的依赖、不过度抽象
2. **移动端优先**：60%使用场景在手机上，所有页面必须移动端友好
3. **数据本地优先**：用户敏感的交易数据，本地存储优先于云端
4. **不连接券商交易接口**：仅记录用途，避免任何"代客交易"嫌疑
5. **不提供荐股或交易建议**：UI/文案必须清晰，这是日志工具不是投顾

## 实际技术栈（当前运行）

- **框架**：Next.js 16 (App Router) · TypeScript 严格模式
- **样式**：Tailwind CSS · 颜色全用 `globals.css` 中的 CSS 变量
- **图表**：Recharts
- **ORM**：Drizzle ORM
- **数据库**：libSQL / Turso（云端 SQLite，兼容本地 `file:local.db`）
  - 环境变量：`TURSO_DATABASE_URL` · `TURSO_AUTH_TOKEN`
  - 本地回退：url 留空时自动使用 `file:local.db`
- **表单**：React Hook Form + Zod
- **日期**：dayjs
- **AI 洞察**：DeepSeek API（`DEEPSEEK_API_KEY`，未配置时优雅降级）
- **包管理**：pnpm · 本地：`pnpm dev --port 5001`
- **认证**：NextAuth.js v5 (beta) · JWT 策略 · 邮箱密码 + Google OAuth
- **部署**：Vercel · https://trademirror-sand.vercel.app
- **Git remote**：SSH（`git@github.com:JiayuanUXD/trademirror.git`）

## 部署注意事项

1. 部署前跑 `pnpm tsc --noEmit` 确认无类型错误
2. GitHub 仓库必须是**公开**的，或已安装 Vercel GitHub App（否则部署会卡在 BLOCKED）
3. `vercel deploy --prod` 上传体积异常小（< 100KB）= Git 拉取权限问题，不要反复重试
4. 遇到 BLOCKED 先 `vercel remove <url> --yes` 清除卡住的部署再重新来
5. Vercel Node.js 版本固定 22.x LTS（项目设置已配好，不要改成最新大版本）
6. 环境变量清单：`TURSO_DATABASE_URL` · `TURSO_AUTH_TOKEN` · `AUTH_SECRET` · `NEXTAUTH_SECRET` · `KIMI_API_KEY`（可选，图片识别优先）· `DEEPSEEK_API_KEY`（可选）· `GEMINI_API_KEY`（可选）· `TUSHARE_API_TOKEN`（可选，盘后分析）

## 实际目录结构

```
app/
├── (auth)/               # 登录、注册、改密（无 Sidebar）
├── (main)/               # 主应用（含 Sidebar + Navbar）
│   ├── page.tsx          # 仪表板（含所有分析图表，/analytics → redirect here）
│   ├── decisions/        # 决策卡列表、新建、详情、CSV 导入
│   ├── holdings/         # 持仓库
│   ├── reviews/          # 周复盘
│   ├── portraits/        # 月度画像
│   ├── errors/           # 错误类型库
│   ├── goals/            # 目标管理
│   ├── alerts/           # 智能预警（SSE 实时推送）
│   ├── calculators/      # 计算器套件
│   ├── calendar/         # 回顾日历
│   ├── settings/         # 设置（持久化到 DB settings 表）
│   └── admin/            # 管理员后台
└── api/                  # API Routes

components/
├── decisions/            # 决策卡表单、危险拦截弹窗
├── analytics/            # 图表组件（Recharts）、AI 洞察卡
├── holdings/             # 持仓卡片、详情 Tab
├── reviews/              # 复盘表单、纪律打分
├── calculators/          # 各计算器组件
├── portraits/            # 月度画像表单
└── shared/               # Sidebar、Navbar

lib/
├── db/
│   ├── schema.ts         # Drizzle schema（所有表定义）
│   ├── index.ts          # libSQL client + drizzle 实例
│   ├── migrate.ts        # 启动时 DDL + seed（由 instrumentation.ts 调用）
│   └── queries/          # 按模块拆分的查询函数
├── analytics/index.ts    # 图表数据计算（getBasisBreakdown、getFomoVsReturn 等）
└── insights.ts           # AI 洞察生成（DeepSeek）

types/                    # 全局 TypeScript 类型（decision, review, holding…）
```

## 关键业务规则（必须遵守）

### 决策卡
- **不允许删除**：错误不能被掩盖，只能"归档"
- **不允许修改情绪评分**：填了就锁定，避免事后美化
- **危险信号自动计算**：FOMO≥7 / 平静度≤4 / 不符合体系 / 含非理性决策依据
- 提交前触发软拦截弹窗（`components/decisions/danger-dialog.tsx`），展示用户自身历史数据

### 持仓档案
- 每只股票一份档案，5个Tab：持有逻辑 / 持有前提 / 撤退条件 / 操作记录 / 新闻追踪
- 逻辑评分 0-10，健康分 0-100（自动计算）

### 周复盘
- 上周复盘未完成，不能开始新一周的决策卡（`/decisions/new` 会拦截）
- 三问必填 + 纪律分 7 项（满分 14）

## 代码风格

- 默认 Server Components，按需 `"use client"`
- 不使用 `any`，必要时用 `unknown` + 类型守卫
- 优先使用 `type` 而非 `interface`
- 颜色全用 CSS 变量（`globals.css`），禁止硬编码色值
- **A股色彩规范**：红=买入/上涨/盈利（`--color-up`），绿=卖出/下跌/亏损（`--color-down`）
- 函数 < 50 行，抽象层最多3层
- 禁止 `TODO: implement later`，要么做要么不做
- Git Commit：Conventional Commits（feat / fix / docs / refactor / chore）

## 调试与提问约定

**不确定时**：先问，提供 2-3 个选项，重要架构决策讨论后再动手。

**完成功能时**：说做了什么（≤5条）、没做什么、下一步建议。

**犯错时**：直接说"我错了"，解释根因，说如何避免。

## Skill routing

When the user's request matches an available skill, invoke it via the Skill tool. When in doubt, invoke the skill.

Key routing rules:
- Product ideas/brainstorming → invoke /office-hours
- Strategy/scope → invoke /plan-ceo-review
- Architecture → invoke /plan-eng-review
- Design system/plan review → invoke /design-consultation or /plan-design-review
- Full review pipeline → invoke /autoplan
- Bugs/errors → invoke /investigate
- QA/testing site behavior → invoke /qa or /qa-only
- Code review/diff check → invoke /review
- Visual polish → invoke /design-review
- Ship/deploy/PR → invoke /ship or /land-and-deploy
- Save progress → invoke /context-save
- Resume context → invoke /context-restore
- Author a backlog-ready spec/issue → invoke /spec
