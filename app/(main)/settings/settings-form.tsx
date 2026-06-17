"use client";

import { useState } from "react";
import { Settings } from "@/lib/db/queries/settings";
import { saveSettingsAction } from "./actions";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="card-surface rounded-xl border p-5 space-y-4"
    >
      <h2 className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>
        {title}
      </h2>
      {children}
    </div>
  );
}

function SettingRow({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex-1">
        <p className="text-sm" style={{ color: "var(--foreground)" }}>{label}</p>
        {hint && <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>{hint}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function NumberInput({
  value,
  onChange,
  min,
  max,
  step = 1,
  suffix,
}: {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (!isNaN(n) && n >= min && n <= max) onChange(n);
        }}
        className="w-20 h-8 px-2 rounded-lg text-sm text-right border"
        style={{
          backgroundColor: "var(--surface-overlay)",
          borderColor: "var(--border-subtle)",
          color: "var(--foreground)",
        }}
      />
      {suffix && (
        <span className="text-sm" style={{ color: "var(--muted-foreground)" }}>{suffix}</span>
      )}
    </div>
  );
}

export function SettingsForm({ initialSettings }: { initialSettings: Settings }) {
  const [settings, setSettings] = useState<Settings>(initialSettings);

  function update(patch: Partial<Settings>) {
    setSettings((s) => ({ ...s, ...patch }));
    saveSettingsAction(patch);
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold" style={{ color: "var(--foreground)" }}>设置</h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--muted-foreground)" }}>
          配置你的纪律规则，让系统替你守住底线
        </p>
      </div>

      {/* Profile */}
      <Section title="个人信息">
        <SettingRow label="你的名字" hint="用于首页问候语">
          <input
            type="text"
            maxLength={10}
            placeholder="阿强"
            value={settings.displayName}
            onChange={(e) => update({ displayName: e.target.value })}
            className="w-28 h-8 px-2 rounded-lg text-sm border"
            style={{
              backgroundColor: "var(--surface-overlay)",
              borderColor: "var(--border-subtle)",
              color: "var(--foreground)",
            }}
          />
        </SettingRow>
        <SettingRow label="账户总资金" hint="用于计算单股仓位占比">
          <NumberInput
            value={settings.totalCapital}
            onChange={(v) => update({ totalCapital: v })}
            min={0}
            max={100000000}
            step={10000}
            suffix="元"
          />
        </SettingRow>
      </Section>

      {/* Discipline rules */}
      <Section title="纪律规则">
        <SettingRow
          label="单股最大仓位"
          hint="超出时触发危险信号 · 纪律打分自动评估"
        >
          <NumberInput
            value={settings.maxPositionPct}
            onChange={(v) => update({ maxPositionPct: v })}
            min={5}
            max={100}
            step={5}
            suffix="%"
          />
        </SettingRow>

        <div className="border-t" style={{ borderColor: "var(--border-subtle)" }} />

        <SettingRow
          label="每周操作上限"
          hint="超出时周复盘纪律分自动扣分"
        >
          <NumberInput
            value={settings.weeklyTradeLimit}
            onChange={(v) => update({ weeklyTradeLimit: v })}
            min={1}
            max={20}
            suffix="笔"
          />
        </SettingRow>

        <div className="border-t" style={{ borderColor: "var(--border-subtle)" }} />

        <SettingRow
          label="单日开仓上限"
          hint="护栏会在当日开仓笔数将超此值时弹出提醒"
        >
          <NumberInput
            value={settings.dailyOpenLimit}
            onChange={(v) => update({ dailyOpenLimit: v })}
            min={1}
            max={10}
            suffix="笔"
          />
        </SettingRow>

        <div className="border-t" style={{ borderColor: "var(--border-subtle)" }} />

        <SettingRow
          label="默认止损比例"
          hint="新建决策卡时作为止损价的参考基准"
        >
          <NumberInput
            value={settings.defaultStopLossPct}
            onChange={(v) => update({ defaultStopLossPct: v })}
            min={1}
            max={50}
            suffix="%"
          />
        </SettingRow>
      </Section>

      {/* Stage position caps */}
      <Section title="情绪阶段仓位上限">
        <p className="text-xs -mt-2 mb-1" style={{ color: "var(--muted-foreground)" }}>
          市场情绪页据此限制总仓位，输入百分比（0~100），系统按你的当日阶段自动套用。
        </p>
        <SettingRow label="冰点（ICE）" hint="低情绪、跌停明显，建议严控">
          <NumberInput
            value={Math.round(settings.capIce * 100)}
            onChange={(v) => update({ capIce: v / 100 })}
            min={0}
            max={100}
            step={5}
            suffix="%"
          />
        </SettingRow>
        <div className="border-t" style={{ borderColor: "var(--border-subtle)" }} />
        <SettingRow label="修复（REPAIR）" hint="情绪缓和回升">
          <NumberInput
            value={Math.round(settings.capRepair * 100)}
            onChange={(v) => update({ capRepair: v / 100 })}
            min={0}
            max={100}
            step={5}
            suffix="%"
          />
        </SettingRow>
        <div className="border-t" style={{ borderColor: "var(--border-subtle)" }} />
        <SettingRow label="发酵（FERMENT）" hint="高标出现、人气抬升">
          <NumberInput
            value={Math.round(settings.capFerment * 100)}
            onChange={(v) => update({ capFerment: v / 100 })}
            min={0}
            max={100}
            step={5}
            suffix="%"
          />
        </SettingRow>
        <div className="border-t" style={{ borderColor: "var(--border-subtle)" }} />
        <SettingRow label="主升（MAIN_RISE）" hint="梯队完整，可放到个人最大值">
          <NumberInput
            value={Math.round(settings.capMainRise * 100)}
            onChange={(v) => update({ capMainRise: v / 100 })}
            min={0}
            max={100}
            step={5}
            suffix="%"
          />
        </SettingRow>
        <div className="border-t" style={{ borderColor: "var(--border-subtle)" }} />
        <SettingRow label="退潮（EBB）" hint="三核心同向走低，建议降仓">
          <NumberInput
            value={Math.round(settings.capEbb * 100)}
            onChange={(v) => update({ capEbb: v / 100 })}
            min={0}
            max={100}
            step={5}
            suffix="%"
          />
        </SettingRow>
      </Section>

      {/* Stage threshold rules */}
      <Section title="阶段判定阈值（高级）">
        <p className="text-xs -mt-2 mb-1" style={{ color: "var(--muted-foreground)" }}>
          调阈值前先看《市场情绪》页的历史阶段是否合理。改动会立即影响仪表盘和选股闸门。
          默认值是按 A 股近年 5400 只池子的常见情形估的。
        </p>

        <p className="text-[11px] mt-1" style={{ color: "var(--muted-foreground)" }}>主升 · 同时满足三个条件</p>
        <SettingRow label="涨停家数 ≥" hint="高位行情的人气门槛">
          <NumberInput
            value={settings.thrMainRiseLimitUp}
            onChange={(v) => update({ thrMainRiseLimitUp: v })}
            min={20}
            max={200}
            step={5}
            suffix="家"
          />
        </SettingRow>
        <SettingRow label="封板率 ≥" hint="封板率越高代表追涨意愿越强">
          <NumberInput
            value={Math.round(settings.thrMainRiseSealRate * 100)}
            onChange={(v) => update({ thrMainRiseSealRate: v / 100 })}
            min={30}
            max={100}
            step={5}
            suffix="%"
          />
        </SettingRow>
        <SettingRow label="最高连板 ≥" hint="梯队是否完整">
          <NumberInput
            value={settings.thrMainRiseMaxBoards}
            onChange={(v) => update({ thrMainRiseMaxBoards: v })}
            min={2}
            max={12}
            step={1}
            suffix="板"
          />
        </SettingRow>

        <div className="border-t" style={{ borderColor: "var(--border-subtle)" }} />

        <p className="text-[11px] mt-1" style={{ color: "var(--muted-foreground)" }}>退潮 · 跌停辅助</p>
        <SettingRow label="跌停家数 ≥" hint="同时封板率回落即判退潮">
          <NumberInput
            value={settings.thrEbbLimitDown}
            onChange={(v) => update({ thrEbbLimitDown: v })}
            min={10}
            max={100}
            step={5}
            suffix="家"
          />
        </SettingRow>

        <div className="border-t" style={{ borderColor: "var(--border-subtle)" }} />

        <p className="text-[11px] mt-1" style={{ color: "var(--muted-foreground)" }}>冰点 · 同时满足两个条件</p>
        <SettingRow label="涨停家数 <" hint="人气稀薄的上限">
          <NumberInput
            value={settings.thrIceLimitUp}
            onChange={(v) => update({ thrIceLimitUp: v })}
            min={10}
            max={80}
            step={5}
            suffix="家"
          />
        </SettingRow>
        <SettingRow label="最高连板 ≤" hint="无高标方算冰点">
          <NumberInput
            value={settings.thrIceMaxBoards}
            onChange={(v) => update({ thrIceMaxBoards: v })}
            min={1}
            max={5}
            step={1}
            suffix="板"
          />
        </SettingRow>

        <div className="border-t" style={{ borderColor: "var(--border-subtle)" }} />

        <p className="text-[11px] mt-1" style={{ color: "var(--muted-foreground)" }}>发酵 · 同时满足两个条件</p>
        <SettingRow label="涨停家数 ≥" hint="人气抬头的门槛">
          <NumberInput
            value={settings.thrFermentLimitUp}
            onChange={(v) => update({ thrFermentLimitUp: v })}
            min={20}
            max={150}
            step={5}
            suffix="家"
          />
        </SettingRow>
        <SettingRow label="最高连板 ≥" hint="出现高标方算发酵">
          <NumberInput
            value={settings.thrFermentMaxBoards}
            onChange={(v) => update({ thrFermentMaxBoards: v })}
            min={2}
            max={10}
            step={1}
            suffix="板"
          />
        </SettingRow>
      </Section>

      {/* Screener funnel · liquidity filter */}
      <Section title="选股漏斗 · 流动性过滤">
        <p className="text-xs -mt-2 mb-1" style={{ color: "var(--muted-foreground)" }}>
          盘后扫描全市场，先过这层过滤，再被阶段闸门收口。低于成交额或换手率门槛的股票直接出局。
        </p>
        <SettingRow label="成交额下限" hint="低于此值的股票流动性不达标">
          <NumberInput
            value={settings.minTurnoverYi}
            onChange={(v) => update({ minTurnoverYi: v })}
            min={0}
            max={50}
            step={0.5}
            suffix="亿"
          />
        </SettingRow>
        <div className="border-t" style={{ borderColor: "var(--border-subtle)" }} />
        <SettingRow label="换手率下限" hint="低于此值意味着没人在交易">
          <NumberInput
            value={settings.minTurnoverRatePct}
            onChange={(v) => update({ minTurnoverRatePct: v })}
            min={0}
            max={50}
            step={0.5}
            suffix="%"
          />
        </SettingRow>
        <div className="border-t" style={{ borderColor: "var(--border-subtle)" }} />
        <SettingRow label="换手率上限" hint="过高视为妖股，排除">
          <NumberInput
            value={settings.maxTurnoverRatePct}
            onChange={(v) => update({ maxTurnoverRatePct: v })}
            min={5}
            max={100}
            step={5}
            suffix="%"
          />
        </SettingRow>
        <div className="border-t" style={{ borderColor: "var(--border-subtle)" }} />
        <SettingRow label="股价区间下限">
          <NumberInput
            value={settings.minPrice}
            onChange={(v) => update({ minPrice: v })}
            min={1}
            max={50}
            step={1}
            suffix="元"
          />
        </SettingRow>
        <div className="border-t" style={{ borderColor: "var(--border-subtle)" }} />
        <SettingRow label="股价区间上限">
          <NumberInput
            value={settings.maxPrice}
            onChange={(v) => update({ maxPrice: v })}
            min={20}
            max={5000}
            step={50}
            suffix="元"
          />
        </SettingRow>
        <div className="border-t" style={{ borderColor: "var(--border-subtle)" }} />
        <SettingRow label="剔除 ST / 退市股" hint="名称含 ST 或 退 字直接出局">
          <input
            type="checkbox"
            checked={settings.excludeSt}
            onChange={(e) => update({ excludeSt: e.target.checked })}
            className="w-4 h-4"
          />
        </SettingRow>
        <div className="border-t" style={{ borderColor: "var(--border-subtle)" }} />
        <SettingRow label="剔除新股 / 次新" hint="名称前缀 N / C 的股票直接出局">
          <input
            type="checkbox"
            checked={settings.excludeNew}
            onChange={(e) => update({ excludeNew: e.target.checked })}
            className="w-4 h-4"
          />
        </SettingRow>
        <div className="border-t" style={{ borderColor: "var(--border-subtle)" }} />
        <SettingRow label="候选池上限" hint="阶段闸门上限会优先生效；这里是个人硬上限">
          <NumberInput
            value={settings.maxPoolSize}
            onChange={(v) => update({ maxPoolSize: v })}
            min={3}
            max={20}
            step={1}
            suffix="只"
          />
        </SettingRow>
      </Section>

      {/* Discipline reference */}
      <Section title="纪律说明（只读）">
        <div className="space-y-3">
          {[
            { label: "每笔交易填决策卡", desc: "系统自动检测" },
            { label: "不追涨停/单日涨超7%股票", desc: "手动诚实打分" },
            { label: "不满仓加杠杆", desc: "手动诚实打分" },
            { label: "不看股吧/荐股群", desc: "手动诚实打分" },
            { label: "不盘中追高/恐慌杀跌", desc: "手动诚实打分" },
            {
              label: `单股仓位不超过 ${settings.maxPositionPct}%`,
              desc: "手动诚实打分 · 已根据上方设置更新",
            },
            {
              label: `每周操作不超过 ${settings.weeklyTradeLimit} 笔`,
              desc: "系统自动检测 · 已根据上方设置更新",
            },
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-2">
              <div
                className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                style={{ backgroundColor: "var(--brand-blue)" }}
              />
              <div>
                <p className="text-sm" style={{ color: "var(--foreground)" }}>{item.label}</p>
                <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Save notice */}
      <p className="text-center text-xs" style={{ color: "var(--muted-foreground)" }}>
        所有设置在修改时自动保存到数据库
      </p>
    </div>
  );
}
