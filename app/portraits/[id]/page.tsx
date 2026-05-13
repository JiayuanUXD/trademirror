import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getPortraitById } from "@/lib/db/queries/portraits";
import { PortraitForm } from "@/components/portraits/portrait-form";
import { PROBLEM_DEFINITIONS } from "@/types/portrait";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

const MONTH_NAMES = ["一","二","三","四","五","六","七","八","九","十","十一","十二"];

function StatCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div
      className="rounded-lg border px-3 py-2.5 text-center"
      style={{ backgroundColor: "var(--surface-overlay)", borderColor: "var(--border-subtle)" }}
    >
      <div className="text-xl font-bold" style={{ color: color ?? "var(--foreground)" }}>{value}</div>
      <div className="text-[11px] mt-0.5" style={{ color: "var(--muted-foreground)" }}>{label}</div>
    </div>
  );
}

export default async function PortraitDetailPage({ params }: Props) {
  const { id } = await params;
  const portrait = await getPortraitById(id);
  if (!portrait) notFound();

  const fomoColor = portrait.fomoAvg >= 7
    ? "var(--brand-red)"
    : portrait.fomoAvg >= 5
    ? "var(--brand-warning)"
    : "var(--brand-green)";

  const dangerColor = portrait.dangerCount === 0
    ? "var(--brand-green)"
    : portrait.dangerCount >= 3
    ? "var(--brand-red)"
    : "var(--brand-warning)";

  const irrColor = portrait.irrationalPct >= 40
    ? "var(--brand-red)"
    : portrait.irrationalPct >= 20
    ? "var(--brand-warning)"
    : "var(--brand-green)";

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <div>
        <Link
          href="/portraits"
          className="inline-flex items-center gap-1 text-xs mb-4 transition-colors"
          style={{ color: "var(--muted-foreground)" }}
        >
          <ChevronLeft size={13} />
          月度画像列表
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold" style={{ color: "var(--foreground)" }}>
            {portrait.year}年{MONTH_NAMES[portrait.month - 1]}月画像
          </h1>
          {portrait.status === "COMPLETED" && (
            <span
              className="text-[11px] px-2 py-0.5 rounded-full font-medium"
              style={{ backgroundColor: "rgba(34,197,94,0.12)", color: "var(--brand-green)" }}
            >
              已完成
            </span>
          )}
        </div>
      </div>

      {/* Auto stats */}
      {portrait.decisionCount === 0 ? (
        <div
          className="rounded-xl border px-4 py-6 text-center"
          style={{ backgroundColor: "var(--surface-card)", borderColor: "var(--border-subtle)" }}
        >
          <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>本月暂无决策记录</p>
        </div>
      ) : (
        <div
          className="rounded-xl border p-4 space-y-3"
          style={{ backgroundColor: "var(--surface-card)", borderColor: "var(--border-subtle)" }}
        >
          <h2 className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>
            本月数据
          </h2>
          <div className="grid grid-cols-4 gap-2">
            <StatCard label="决策次数" value={String(portrait.decisionCount)} />
            <StatCard label="高危笔数" value={String(portrait.dangerCount)} color={dangerColor} />
            <StatCard label="FOMO均值" value={String(portrait.fomoAvg)} color={fomoColor} />
            <StatCard label="非理性占比" value={`${portrait.irrationalPct}%`} color={irrColor} />
          </div>
          {portrait.avgDiscipline > 0 && (
            <div
              className="flex items-center justify-between px-3 py-2 rounded-lg"
              style={{ backgroundColor: "var(--surface-overlay)" }}
            >
              <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>本月平均纪律分</span>
              <span
                className="text-sm font-bold"
                style={{
                  color: portrait.avgDiscipline >= 10
                    ? "var(--brand-green)"
                    : portrait.avgDiscipline >= 7
                    ? "var(--brand-warning)"
                    : "var(--brand-red)",
                }}
              >
                {portrait.avgDiscipline}/14
              </span>
            </div>
          )}
          {portrait.emotionalCount > 0 && (
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
              style={{ backgroundColor: "rgba(245,158,11,0.08)", color: "var(--brand-warning)", border: "1px solid rgba(245,158,11,0.2)" }}
            >
              ⚠ 本月共 {portrait.emotionalCount} 笔情绪化交易（FOMO≥7 或平静度≤4）
            </div>
          )}
        </div>
      )}

      {/* Completed focus display */}
      {portrait.status === "COMPLETED" && portrait.nextFocus && (
        <div
          className="rounded-xl border p-4"
          style={{ backgroundColor: "var(--surface-card)", borderColor: "var(--border-subtle)" }}
        >
          <p className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: "var(--muted-foreground)" }}>
            下月改进重点
          </p>
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium"
            style={{ backgroundColor: "rgba(61,142,248,0.12)", color: "var(--brand-blue)" }}
          >
            🎯 {PROBLEM_DEFINITIONS[portrait.nextFocus]?.label}
          </div>
        </div>
      )}

      {/* Form */}
      <div
        className="rounded-xl border p-5"
        style={{ backgroundColor: "var(--surface-card)", borderColor: "var(--border-subtle)" }}
      >
        <PortraitForm portrait={portrait} />
      </div>
    </div>
  );
}
