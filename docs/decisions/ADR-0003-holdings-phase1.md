# ADR-0003: 持仓库 Phase 1 架构

## 状态
Accepted

## 背景
需要实现持仓库：每只股票一份"成长档案"，包含持有逻辑、持有前提、撤退条件、操作记录、健康分。

## 决定

### 数据结构
- `holdings` 表：每只股票一行
- `logic`、`prerequisites`、`exitConditions` 字段存 JSON，保持灵活性
- 健康分在应用层计算（不存 DB，每次读取时实时算），查询量小无性能问题

### 健康分算法（0-100）
- 持有逻辑完整度（0-50）：每条理由 +8 分（max 5 条 = 40），有数据支撑 +5，可验证 +5
- 撤退条件（0-30）：每个有效条件 +10（max 3）
- 持有前提（0-20）：每项前提 +5（max 4）

### 路由结构
- `GET /api/holdings` — 列表
- `POST /api/holdings` — 创建
- `GET /api/holdings/[id]` — 详情
- `PATCH /api/holdings/[id]` — 更新（逻辑/前提/撤退条件局部更新）

### 详情页 Tabs
Phase 1 实现：持有逻辑、持有前提、撤退条件、操作记录（关联 decisions 表）
新闻追踪 Tab 留给 Phase 2（需要外部 API）

## 理由
- JSON 存复杂嵌套结构，省去多张关联表，MVP 阶段读写都是单行操作
- 健康分实时计算，避免写 DB 和读 DB 不一致

## 后果
- 正面：schema 简单，API 简洁
- 负面：无法对 logic/prerequisites 内部字段做 DB 级 filter，分析时需应用层解析
