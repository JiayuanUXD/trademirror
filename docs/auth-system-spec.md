# TradeMirror · 用户管理系统产品方案

**版本**：v1.0 · **日期**：2026-05-14  
**状态**：待评审

---

## 一、背景与目标

TradeMirror 当前是**单用户无登录**模式，所有数据全局共享。随着产品走向多用户，需要建立：

1. **用户身份体系**：区分谁在使用，数据谁的归谁
2. **角色权限**：管理员可审视用户数据，普通用户只看自己
3. **多种登录方式**：兼顾国内用户习惯（微信、手机号）和国际用户（Google）

---

## 二、角色与权限

### 角色定义

| 角色 | 标识 | 说明 |
|------|------|------|
| 普通用户 | `user` | 默认角色，注册即拥有；只能访问和管理自己的数据 |
| 管理员 | `admin` | 手动提升；可读取所有用户数据，不可代其操作 |

### 权限矩阵

| 操作 | 普通用户 | 管理员 |
|------|----------|--------|
| 查看/创建/编辑自己的决策卡、持仓、复盘等 | ✅ | ✅ |
| 查看**其他用户**的数据（只读） | ❌ | ✅ |
| 用户列表 | ❌ | ✅ |
| 提升/降级用户角色 | ❌ | ✅ |
| 禁用/启用账户 | ❌ | ✅ |
| 查看全局统计（注册数、活跃度） | ❌ | ✅ |

> 管理员**不能**代替用户创建或修改数据（情绪评分的不可篡改原则延伸到多用户场景）。

---

## 三、认证方式

### 3.1 邮箱 + 密码（优先实现）

- 注册：邮箱 + 密码（≥8位，需含字母和数字） + 展示名
- 密码用 bcrypt 存储（cost = 12）
- 登录：邮箱 + 密码
- 忘记密码：发送重置链接到邮箱（需配置邮件服务）

### 3.2 Google 登录（第二优先）

- 标准 OAuth 2.0 流程，NextAuth 原生支持
- 依赖：Google Cloud Console 项目 + OAuth Client ID/Secret

### 3.3 手机号 + 验证码（第三优先）

- 输入手机号 → 发送6位短信验证码 → 验证通过即登录/注册
- 验证码有效期：5分钟，每个手机号每分钟限发1次
- 依赖：**短信服务商**（推荐阿里云短信或腾讯云短信，需备案主体）

### 3.4 微信登录（第四优先）

- 扫码登录（网页端）或微信内 H5 授权登录
- 依赖：**微信开放平台**账号（需企业主体或个人认证） + 已审核通过的应用
- 国内限制：微信 OAuth 仅在备案域名下生效，本地开发需内网穿透

### 账号合并规则

同一邮箱地址通过不同方式登录时，**自动合并**为同一用户（例：邮箱注册后再用 Google 同邮箱登录，不会创建两个账户）。

---

## 四、初始账号

| 字段 | 值 |
|------|----|
| 展示名 | jiayuan |
| 邮箱 | admin@trademirror.com |
| 密码 | admin123（首次登录后**必须修改**） |
| 角色 | admin |

- 通过 `lib/db/migrate.ts` 在启动时 `INSERT OR IGNORE` 创建，密码以 bcrypt hash 存储
- 生产环境首次登录后会跳转到强制修改密码页面

---

## 五、数据隔离方案

现有所有业务表（decisions、holdings、weekly_reviews、monthly_portraits、goals、error_types、error_logs、settings）**均需添加 `userId` 字段**，并加索引。

### 迁移策略

```
现有数据 → 全部归属初始 admin 账号（jiayuan）
新注册用户 → 看到空的干净状态
```

具体步骤：
1. 所有业务表新增 `user_id TEXT NOT NULL DEFAULT 'jiayuan'`（迁移期默认值）
2. 迁移完成后去掉 DEFAULT，新增数据必须显式传 userId
3. 所有查询函数增加 `WHERE user_id = ?` 过滤
4. 所有 API Route 从 session 中取 userId，不信任客户端传入

---

## 六、管理员面板

路由：`/admin`（仅 admin 角色可访问）

### 用户列表页 `/admin/users`

| 列 | 说明 |
|----|------|
| 展示名 / 邮箱 | 基本信息 |
| 注册时间 | |
| 最后登录 | |
| 角色 | user / admin，可切换 |
| 决策卡数 / 活跃持仓数 | 简要统计 |
| 状态 | 正常 / 已禁用 |
| 操作 | 查看数据 · 切换角色 · 禁用 |

### 查看用户数据 `/admin/users/[userId]`

- 与普通用户看到的界面完全一致，但顶部有醒目的「管理员视图 · 只读」横幅
- 所有写操作按钮不可点击（disabled）
- URL 含 `?asUser=[userId]`，服务端验证 admin 身份后注入目标 userId

### 全局统计 `/admin/stats`

- 注册用户总数、本周活跃用户数
- 全平台本周决策卡总数 / 高危交易占比
- 简单折线图（复用现有 Recharts 组件）

---

## 七、用户界面变更

### 新增页面

| 路由 | 说明 |
|------|------|
| `/login` | 登录页（邮箱/Google/手机号/微信 Tab 切换） |
| `/register` | 注册页（邮箱+密码） |
| `/forgot-password` | 忘记密码 |
| `/reset-password` | 重置密码（带 token） |
| `/admin` | 管理员入口（重定向到 `/admin/users`） |
| `/admin/users` | 用户列表 |
| `/admin/users/[id]` | 查看指定用户数据 |
| `/admin/stats` | 全局统计 |

### 现有页面改动

- **Sidebar**：底部加用户头像 + 展示名 + 退出登录
- **Navbar**：右上角头像下拉菜单（个人设置 / 退出）
- **所有业务页面**：数据查询自动带当前用户 userId，无需改动 UI

### 中间件保护

```
/               → 需登录
/decisions/*    → 需登录
/holdings/*     → 需登录
/reviews/*      → 需登录
/admin/*        → 需 admin 角色
/login          → 已登录则重定向到 /
/register       → 已登录则重定向到 /
```

---

## 八、技术选型

| 组件 | 选型 | 说明 |
|------|------|------|
| 认证框架 | NextAuth.js v5 (Auth.js) | 已在技术栈规划中，支持所有所需 Provider |
| 邮箱+密码 | `CredentialsProvider` | NextAuth 内置 |
| Google | `GoogleProvider` | NextAuth 内置 |
| 微信 | 自定义 OAuth Provider | 需按微信文档配置 |
| 手机号 | 自定义 Provider + 短信API | 需接入短信服务商 |
| 密码加密 | bcryptjs（纯 JS，兼容 Edge）| cost = 12 |
| DB 适配器 | `@auth/drizzle-adapter` | 自动管理 users/accounts/sessions 表 |
| Session 策略 | JWT（无状态，适合 Serverless/Vercel） | |

---

## 九、数据库新增表

### `users`（由 NextAuth adapter 管理）
```
id          TEXT PK
name        TEXT
email       TEXT UNIQUE
emailVerified INTEGER
image       TEXT
role        TEXT DEFAULT 'user'   ← 新增字段
disabled    INTEGER DEFAULT 0     ← 新增字段
createdAt   INTEGER
```

### `accounts`（OAuth 账号关联，由 adapter 管理）
```
id                TEXT PK
userId            TEXT FK→users.id
type              TEXT   (oauth / credentials)
provider          TEXT   (google / wechat / phone / credentials)
providerAccountId TEXT
...标准 OAuth 字段
```

### `sessions`（由 adapter 管理，JWT 模式下可省略）

### `verification_tokens`（邮箱验证 / 密码重置 token）

### 现有业务表变更
```sql
ALTER TABLE decisions      ADD COLUMN user_id TEXT NOT NULL DEFAULT 'jiayuan';
ALTER TABLE holdings       ADD COLUMN user_id TEXT NOT NULL DEFAULT 'jiayuan';
ALTER TABLE weekly_reviews ADD COLUMN user_id TEXT NOT NULL DEFAULT 'jiayuan';
ALTER TABLE monthly_portraits ADD COLUMN user_id TEXT NOT NULL DEFAULT 'jiayuan';
ALTER TABLE goals          ADD COLUMN user_id TEXT NOT NULL DEFAULT 'jiayuan';
ALTER TABLE error_types    ADD COLUMN user_id TEXT NOT NULL DEFAULT 'jiayuan';
ALTER TABLE error_logs     ADD COLUMN user_id TEXT NOT NULL DEFAULT 'jiayuan';
ALTER TABLE settings       ADD COLUMN user_id TEXT NOT NULL DEFAULT 'jiayuan';

-- 索引
CREATE INDEX idx_decisions_user      ON decisions(user_id);
CREATE INDEX idx_holdings_user       ON holdings(user_id);
CREATE INDEX idx_weekly_reviews_user ON weekly_reviews(user_id);
-- ... 其余同理
```

---

## 十、实施计划

### Phase 1 · 基础认证（邮箱+密码）— 预计 3 天

**目标**：用户能注册、登录、退出；数据完成隔离；初始 admin 账号可用。

| 任务 | 文件 | 说明 |
|------|------|------|
| 安装依赖 | package.json | `next-auth@beta` `@auth/drizzle-adapter` `bcryptjs` `@types/bcryptjs` |
| 新增 auth 相关 DB 表 | `lib/db/schema.ts` | users / accounts / verification_tokens |
| 业务表添加 userId | `lib/db/schema.ts` + `migrate.ts` | ALTER TABLE + 索引 |
| NextAuth 配置 | `auth.ts`（根目录） | CredentialsProvider + Drizzle adapter + JWT |
| Route Handler | `app/api/auth/[...nextauth]/route.ts` | NextAuth 标准接入 |
| 登录页 | `app/login/page.tsx` | 邮箱+密码表单 |
| 注册页 | `app/register/page.tsx` | 含邮箱唯一性检查 |
| 中间件保护 | `middleware.ts` | 拦截未登录访问业务路由 |
| Sidebar 用户区域 | `components/shared/sidebar.tsx` | 头像 + 展示名 + 退出 |
| 所有查询函数注入 userId | `lib/db/queries/*.ts` | 8 个文件各加 `where(eq(table.userId, userId))` |
| 初始 admin 账号 seed | `lib/db/migrate.ts` | bcrypt hash admin123，INSERT OR IGNORE |

**验收标准**：
- [ ] 新注册用户看到空数据，互相数据隔离
- [ ] jiayuan 账号用 admin123 可登录，看到历史数据
- [ ] 未登录访问 `/decisions` 跳转到 `/login`

---

### Phase 2 · 管理员面板 — 预计 2 天

**目标**：admin 能看到用户列表和任意用户的数据。

| 任务 | 文件 |
|------|------|
| 管理员中间件 | `middleware.ts` 扩展 `/admin/*` 保护 |
| 用户列表页 | `app/admin/users/page.tsx` |
| 用户详情（只读视图） | `app/admin/users/[id]/page.tsx` |
| 全局统计页 | `app/admin/stats/page.tsx` |
| Sidebar 管理员入口 | 仅 admin 可见 |
| 用户角色切换 API | `app/api/admin/users/[id]/role/route.ts` |
| 用户禁用 API | `app/api/admin/users/[id]/disable/route.ts` |
| 强制改密（首次登录检测） | `app/change-password/page.tsx` |

**验收标准**：
- [ ] admin 能看到所有用户列表和数据
- [ ] 普通用户访问 `/admin` 返回 403
- [ ] jiayuan 首次登录后弹出强制改密提示

---

### Phase 3 · Google 登录 — 预计 1 天

**前置条件**：Google Cloud Console 配置 OAuth 2.0 Client，获取 `CLIENT_ID` 和 `CLIENT_SECRET`。

| 任务 | 说明 |
|------|------|
| 添加 GoogleProvider | `auth.ts` 中加 provider |
| 登录页加 Google 按钮 | `app/login/page.tsx` |
| 环境变量 | `GOOGLE_CLIENT_ID` `GOOGLE_CLIENT_SECRET` |
| 同邮箱账号合并逻辑 | 在 NextAuth `signIn` callback 处理 |

---

### Phase 4 · 手机号登录 — 预计 2-3 天

**前置条件**：短信服务商账号（阿里云/腾讯云），已完成实名认证，获取 API Key。

| 任务 | 说明 |
|------|------|
| 短信发送 API | `app/api/auth/send-sms/route.ts` |
| 验证码存储 | Redis 或 DB 临时表，5分钟 TTL |
| 自定义 PhoneProvider | NextAuth CredentialsProvider 变体 |
| 登录页手机号 Tab | UI 组件 |
| 环境变量 | `SMS_ACCESS_KEY_ID` `SMS_ACCESS_KEY_SECRET` `SMS_SIGN_NAME` `SMS_TEMPLATE_CODE` |

---

### Phase 5 · 微信登录 — 预计 3-5 天

**前置条件**（耗时最长，需提前准备）：
- 微信开放平台账号（企业主体 or 个人认证，审核 1-7 天）
- 网站应用申请通过审核（含域名备案）
- 获取 `AppID` 和 `AppSecret`

| 任务 | 说明 |
|------|------|
| 自定义 WechatProvider | 微信 OAuth 不在 NextAuth 内置，手写 |
| 扫码组件 | 网页端展示微信二维码，轮询授权结果 |
| H5 授权（可选） | 微信内置浏览器 `code` 换 token 流程 |
| 环境变量 | `WECHAT_APP_ID` `WECHAT_APP_SECRET` |

---

## 十一、环境变量清单

```env
# NextAuth
NEXTAUTH_SECRET=<随机32位字符串>
NEXTAUTH_URL=https://trademirror-sand.vercel.app

# Google OAuth（Phase 3）
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# 短信服务（Phase 4，以阿里云为例）
SMS_ACCESS_KEY_ID=
SMS_ACCESS_KEY_SECRET=
SMS_SIGN_NAME=TradeMirror
SMS_TEMPLATE_CODE=

# 微信（Phase 5）
WECHAT_APP_ID=
WECHAT_APP_SECRET=
```

---

## 十二、风险与注意事项

| 风险 | 说明 | 对策 |
|------|------|------|
| 数据迁移不可逆 | 业务表加 userId 后旧数据全归 jiayuan | 迁移前备份 Turso DB；本地先验证 |
| 微信登录审核周期 | 开放平台审核 1-7 天，域名备案另需 7-20 天 | Phase 5 最后做，不阻塞主流程 |
| 初始密码安全 | admin123 是弱密码 | 首次登录强制跳转改密页 |
| Turso 无 ALTER TABLE | libSQL 支持有限，不支持 ALTER COLUMN | 用 `ADD COLUMN … DEFAULT` 方式，Drizzle push 可处理 |
| Vercel Serverless 无状态 | 短信验证码不能存内存 | 存 Turso DB 临时表或用 Upstash Redis |
| JWT session 安全 | token 泄露后无法主动失效 | 设置较短过期时间（7天），敏感操作要求重新验证 |

---

## 十三、实施优先级建议

```
Phase 1（邮箱+密码 + 数据隔离）  ← 核心，其他都依赖它
   ↓
Phase 2（管理员面板）             ← 你需要，紧跟上
   ↓
Phase 3（Google）                 ← 1天，性价比最高的 OAuth
   ↓
Phase 4（手机号）                 ← 国内用户友好，需等短信资质
   ↓
Phase 5（微信）                   ← 等微信开放平台审核，并行推进
```

**建议先完成 Phase 1+2 再评估是否继续 Phase 3-5**，因为对于初期小规模用户，邮箱+Google 已经足够覆盖 80% 的登录需求。
