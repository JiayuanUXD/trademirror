# ADR-0005: 决策卡智能拦截（阶段 3B）

## 状态
Accepted

## 背景
PRD 模块 3.2.2 要求决策卡提交前根据填写内容触发"软拦截弹窗"，
关键设计：弹窗中必须**显示用户自己的历史数据**，而不是泛泛警告。

## 决定

### 实现的 4 类拦截
| 触发 | 历史数据 |
|---|---|
| FOMO ≥ 7 | 历史 FOMO≥7 已完成交易中亏损占比 |
| 平静度 ≤ 4 | 历史 平静度≤4 已完成交易中亏损占比 |
| 不符合体系 | 本月已发生 NOT_ALIGN 笔数 + 其中亏损笔数 |
| 距上次操作 < 120 分钟 | 上一笔操作的股票名 + 多久前 |

### 跳过的 1 类
- "单只仓位 > 25%"：当前 `settings` 没有"账户总金额"字段，无法计算占比。
  待后续接入账户总额后单独再做。

### 架构
- 新查询模块：`lib/db/queries/danger-stats.ts`（4 个聚合查询，全部走索引）
- 新 API：`POST /api/decisions/pre-check`
  - 入参 `{ fomoScore, calmScore, systemAlignment }`（不传交易明细，更轻量）
  - 出参 `{ alerts: Array<{ signal, title, message, history }> }`
  - 只查不写，幂等
- 新组件：`components/decisions/danger-dialog.tsx`，基于 `@base-ui/react` Dialog
- 表单流：`attemptSubmit` 先调 pre-check → 有 alert 弹窗 → 用户确认后 `actuallySubmit` POST

### 容错策略
- pre-check 网络失败或 5xx：直接 fallback 到 actuallySubmit，**不阻塞用户**
- 理由：拦截是"软提示"，可用性优先于完美拦截

### 性能
在 `decisions` 表新增 4 个索引：
- `(created_at DESC)` 用于最近一笔查询
- `(fomo_score, is_archived)` 用于 FOMO 统计
- `(calm_score, is_archived)` 用于平静度统计
- `(system_alignment, created_at)` 用于本月 NOT_ALIGN

## 理由
- 把拦截规则放服务端：未来加新规则不用动前端
- DTO 上不返 raw rows，只返 message：把"话术"沉淀在后端，便于一致维护
- 跳过仓位 25% 这条：避免为单一规则提前引入"账户总金额"这种全局状态

## 后果
- 正面：拦截链路独立、可单测；可视化弹窗符合 PRD 的"显示用户自己的数据"原则
- 负面：每次提交多一次 round trip（~50ms），但有索引下可忽略
- 注意：现在 `return_30_days` 是手填回填的，新手用户没数据时会显示"还没参考"——可接受
