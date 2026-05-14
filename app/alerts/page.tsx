import { getDecisions } from "@/lib/db/queries/decisions";
import { getHoldings } from "@/lib/db/queries/holdings";
import { computeAlerts } from "@/lib/alerts";
import { AlertList } from "@/components/alerts/alert-list";

export const dynamic = "force-dynamic";

export default async function AlertsPage() {
  const [decisions, holdings] = await Promise.all([
    getDecisions(200), // 多取用于时间模式分析
    getHoldings(),
  ]);

  const alerts = computeAlerts(decisions, holdings);

  return (
    <div className="px-4 py-5 sm:px-6 sm:py-6 space-y-6">
      {/* 页头 */}
      <div>
        <h1 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>
          智能预警
        </h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--muted-foreground)" }}>
          基于你的决策记录和持仓状态自动计算
        </p>
      </div>

      {/* 预警列表（含统计、dismiss 交互） */}
      <AlertList alerts={alerts} />

      {/* 规则说明 */}
      <div
        className="rounded-xl p-4 space-y-1.5"
        style={{
          backgroundColor: "var(--surface-card)",
          border: "1px solid var(--border-subtle)",
        }}
      >
        <p
          className="text-[11px] font-medium"
          style={{ color: "var(--muted-foreground)" }}
        >
          预警规则说明
        </p>
        {[
          "连续 2 笔 FOMO ≥ 7 → 情绪波动高危（附历史胜率数据）",
          "过去 7 天操作 > 3 次 → 频繁交易",
          "连续 3 笔以上亏损 → 连续亏损预警（附总体亏损率）",
          "30 天内 ≥ 3 笔不符合体系 → 纪律松弛",
          "近 10 笔非理性依据 > 50% → 非理性主导",
          "历史非理性决策时段集中 ≥ 35% → 个性化高危时段提醒",
          "持仓浮盈 ≥ 50% / 浮亏 ≥ 10% → 止盈 / 止损预警",
          "单只持仓占比 > 25% → 集中度超标",
          "持仓股未设任何撤退条件 → 无止损风险",
          "撤退条件已触发 / 当前价低于止损价",
        ].map((rule) => (
          <p
            key={rule}
            className="text-[11px]"
            style={{ color: "var(--muted-foreground)" }}
          >
            · {rule}
          </p>
        ))}
      </div>
    </div>
  );
}
