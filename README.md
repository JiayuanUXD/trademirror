# TradeMirror · 交易之镜

> 不帮你预测市场，帮你看清自己。

面向中国A股个人投资者的交易日志 Web 应用。核心功能：决策卡记录、情绪评分、持仓档案、周复盘、月度画像、AI 洞察。

**线上地址：** https://trademirror-sand.vercel.app

---

## 技术栈

| 层 | 技术 |
|---|---|
| 框架 | Next.js 16 (App Router) · TypeScript 严格模式 |
| 样式 | Tailwind CSS · CSS 变量主题 |
| 数据库 | Turso (libSQL / SQLite) · Drizzle ORM |
| 认证 | NextAuth.js v5 · 邮箱密码 + Google OAuth |
| 图表 | Recharts |
| AI | DeepSeek API（可选） |
| 部署 | Vercel |

## 本地运行

```bash
# 安装依赖
pnpm install

# 配置环境变量（见下方说明）
cp .env.example .env.local

# 启动开发服务器（端口 5001）
pnpm dev --port 5001
```

访问 http://localhost:5001

## 环境变量

```bash
# 数据库（留空时使用本地 file:local.db）
TURSO_DATABASE_URL=libsql://your-db.turso.io
TURSO_AUTH_TOKEN=your-token

# 认证（必填）
AUTH_SECRET=your-secret-32-chars-min

# Google OAuth（可选）
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret

# AI 洞察（可选，不填时静默跳过）
DEEPSEEK_API_KEY=your-api-key
```

初始管理员账号：`jiayuan@trademirror.local` 

## 项目结构

```
app/
├── (auth)/          # 登录、注册、改密（无 Sidebar）
├── (main)/          # 主应用（含 Sidebar + Navbar）
│   ├── page.tsx     # 仪表板（含分析图表）
│   ├── decisions/   # 决策卡
│   ├── holdings/    # 持仓档案
│   ├── reviews/     # 周复盘
│   ├── portraits/   # 月度画像
│   ├── goals/       # 目标管理
│   ├── alerts/      # 智能预警
│   ├── calculators/ # 工具计算器
│   ├── calendar/    # 回顾日历
│   ├── settings/    # 设置
│   └── admin/       # 管理员后台
└── api/             # API Routes
```

## 部署记录

| 日期 | 版本 | 说明 |
|---|---|---|
| 2026-05-15 | v0.3 | 用户认证系统（邮箱+Google）、数据隔离、管理员后台、股票代码自动补全、历史交易补录 |
| 2026-05-13 | v0.2 | 统一仪表板、全宽布局、AI 洞察 |
| 2026-05-10 | v0.1 | 初版上线 |

## 开发文档

- `CLAUDE.md` — 项目宪章（技术栈、业务规则、代码规范）
- `DEVLOG.md` — 开发日志
- `docs/auth-system-spec.md` — 认证系统设计文档
- `PRD_交易日志Web应用_TradeMirror.md` — 产品需求文档
