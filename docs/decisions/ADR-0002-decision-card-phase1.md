# ADR-0002: 决策卡 Phase 1 数据与 UI 架构

## 状态
Accepted

## 背景
MVP 阶段需要实现决策卡的核心录入和列表展示功能。
需要确定：数据库表结构、表单交互模式、多步表单状态管理方式。

## 决定

### 多步表单
- 3个步骤用 React `useState` 管理当前步骤和累计数据，不引入额外状态库
- 每步提交前用 Zod `safeParse` 做客户端校验
- 不依赖 `@hookform/resolvers`，直接用 `useForm` + 手动 Zod 校验

### 数据存储
- SQLite 单表 `decisions`，`basis` 和 `dangerSignals` 字段用 JSON 字符串存储数组
- ID 用 `crypto.randomUUID()`，无需 nanoid
- `createdAt` 存为 Unix timestamp integer（SQLite 无原生 datetime 类型）

### 危险信号计算
- 纯客户端计算，提交前展示给用户（软拦截弹窗 phase 2 再加）
- 服务端 API 写入时再计算一次，确保数据一致性

### API 路由
- `GET /api/decisions` 返回列表（最新在前，limit 50）
- `POST /api/decisions` 创建，服务端校验 + 写 DB

## 理由
- 3步 useState 足够，比 Zustand store 更轻，后续可迁移
- JSON 存数组简单直接，无需关联表，查询也方便（Phase 2 可提取错误类型关联）
- 服务端二次校验防止绕过前端直接调 API

## 后果
- 正面：实现简单，可快速迭代
- 负面：`basis` 字段无法直接 SQL 过滤，分析仪表盘需要在应用层解析 JSON
- 注意：生产切换 PostgreSQL 时，JSON 字段改为 `jsonb` 类型即可
