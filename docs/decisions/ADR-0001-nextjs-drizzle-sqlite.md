# ADR-0001: Next.js + Drizzle ORM + SQLite (开发) / PostgreSQL (生产)

## 状态
Accepted

## 背景
TradeMirror MVP 需要一个能快速迭代、单人可维护、移动端友好的全栈方案。
用户的交易数据具有敏感性，需要支持"本地优先"策略。

## 决定
- **前端框架**: Next.js (App Router) + TypeScript
- **ORM**: Drizzle ORM
- **开发数据库**: SQLite (better-sqlite3)
- **生产数据库**: PostgreSQL (Supabase)

## 理由

### Next.js App Router
- 默认 Server Components，减少客户端 JS 体积，对移动端友好
- API Routes 内置，MVP 阶段不需要单独后端服务
- Vercel 部署零配置

### Drizzle ORM
- 类型安全，schema 即类型定义，无运行时开销
- 同时支持 SQLite 和 PostgreSQL，开发/生产无缝切换
- 比 Prisma 轻量，生成的 SQL 可预期

### SQLite (开发) / PostgreSQL (生产)
- SQLite 本地无需启动数据库服务，开发体验最快
- PostgreSQL 生产环境事务性强，Supabase 免费层够用
- Drizzle 的 dialect 切换只需改一行配置

## 后果
- 正面：开发启动零门槛，schema 变更用 `drizzle-kit push` 即可
- 负面：SQLite 不支持并发写，但 MVP 单用户场景无影响
- 注意：生产切换到 PostgreSQL 时需测试所有查询（类型差异）
