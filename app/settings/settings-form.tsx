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
        <h1 className="text-xl font-semibold" style={{ color: "var(--foreground)" }}>设置</h1>
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
