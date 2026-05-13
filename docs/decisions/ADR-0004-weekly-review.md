# ADR-0004: 周度复盘 Phase 1 架构

## 状态
Accepted

## 背景
需要实现每周强制复盘流程：自动汇总 + 三问必填 + 纪律分（7项，满分14）。

## 决定

### 周的定义
- 每周从周一 00:00 开始到周日 23:59 结束
- `weekStart` 存 Unix timestamp（周一零点），用于关联查询本周决策卡

### 复盘状态
- `DRAFT`：填写中（允许保存草稿）
- `COMPLETED`：已完成（提交后锁定三问，纪律分仍可修改）

### 纪律分
- 7 项，每项 0/1/2 分，满分 14
- 前端存 JSON array：`{id, label, score}[]`
- 其中 2 项可由系统建议（操作次数、决策卡填写率），用户可覆盖

### 自动统计
- 本周决策数：从 decisions 表 WHERE created_at BETWEEN weekStart AND weekEnd
- 高危交易数：danger_signals 不为 `[]`
- 高 FOMO 数：fomo_score >= 7
- 以上统计在 API 层计算后随 review 对象一起返回

### 不强制执行"上周复盘未完成不能下单"的 gate
- Phase 1 只建数据，Phase 2 在决策卡 POST 时加前置检查

## 理由
- 草稿状态避免用户填到一半丢失
- 统计实时算省去触发器，数量级小不影响性能

## 后果
- 正面：复盘流程完整，可独立于决策卡使用
- 负面：Phase 2 才有"强制 gate"，现阶段纯靠自律
