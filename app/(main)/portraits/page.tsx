import Link from "next/link";
import { CheckCircle, Clock, AlertTriangle } from "lucide-react";
import { auth } from "@/auth";
import { getPortraits, getPortraitByYearMonth, createPortrait } from "@/lib/db/queries/portraits";
import dayjs from "dayjs";

export const dynamic = "force-dynamic";

const MONTH_NAMES = ["一","二","三","四","五","六","七","八","九","十","十一","十二"];

function evalColor(pct: number, key: "fomo" | "irrational" | "danger") {
  if (key === "fomo") return pct >= 7 ? "var(--brand-red)" : pct >= 5 ? "var(--brand-warning)" : "var(--brand-green)";
  return pct >= 40 ? "var(--brand-red)" : pct >= 20 ? "var(--brand-warning)" : "var(--brand-green)";
}

export default async function PortraitsPage() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  const now = dayjs();
  const year = now.year();
  const month = now.month() + 1;

  let current = await getPortraitByYearMonth(year, month, userId);
  if (!current) current = await createPortrait(year, month, userId);

  const all = await getPortraits(userId);

  return (
    <div className="px-4 py-5 sm:px-6 sm:py-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>月度画像</h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--muted-foreground)" }}>
          每月一面镜子，看清真实的自己
        </p>
      </div>

      {/* Current month CTA */}
      <Link
        href={`/portraits/${current.id}`}
        className="block rounded-xl border p-5 transition-colors"
        style={{ backgroundColor: "var(--surface-card)", borderColor: "var(--brand-blue)" }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span
                className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                style={{ backgroundColor: "var(--brand-blue-dim)", color: "var(--brand-blue)" }}
              >
                本月
              </span>
              <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                {year}年{MONTH_NAMES[month - 1]}月
              </span>
            </div>
            <h2 className="text-base font-semibold" style={{ color: "var(--foreground)" }}>
              {current.status === "COMPLETED" ? "本月画像已完成" : "本月画像待完成"}
            </h2>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs" style={{ color: "var(--muted-foreground)" }}>
              <span>决策 {current.decisionCount} 笔</span>
              {current.dangerCount > 0 && (
                <span className="flex items-center gap-1" style={{ color: "var(--brand-warning)" }}>
                  <AlertTriangle size={12} /> 高危 {current.dangerCount} 笔
                </span>
              )}
              {current.decisionCount > 0 && (
                <span style={{ color: evalColor(current.fomoAvg, "fomo") }}>
                  FOMO均值 {current.fomoAvg}
                </span>
              )}
              {current.avgDiscipline > 0 && (
                <span>纪律均分 {current.avgDiscipline}/14</span>
              )}
            </div>
          </div>
          <div
            className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center"
            style={{
              backgroundColor: current.status === "COMPLETED"
                ? "rgba(34,197,94,0.12)"
                : "var(--brand-blue-dim)",
            }}
          >
            {current.status === "COMPLETED"
              ? <CheckCircle size={18} style={{ color: "var(--brand-green)" }} />
              : <Clock size={18} style={{ color: "var(--brand-blue)" }} />}
          </div>
        </div>
      </Link>

      {/* History */}
      {all.length > 1 && (
        <div>
          <p className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: "var(--muted-foreground)" }}>
            历史画像
          </p>
          <div className="space-y-2">
            {all.slice(1).map((p) => (
              <Link
                key={p.id}
                href={`/portraits/${p.id}`}
                className="card-interactive flex items-center gap-3 rounded-xl border px-4 py-3"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm" style={{ color: "var(--foreground)" }}>
                      {p.year}年{MONTH_NAMES[p.month - 1]}月
                    </span>
                    {p.status === "COMPLETED"
                      ? <CheckCircle size={13} style={{ color: "var(--brand-green)" }} />
                      : <Clock size={13} style={{ color: "var(--muted-foreground)" }} />}
                  </div>
                  <div className="flex gap-3 mt-0.5 text-[11px]" style={{ color: "var(--muted-foreground)" }}>
                    <span>决策 {p.decisionCount} 笔</span>
                    {p.dangerCount > 0 && (
                      <span style={{ color: "var(--brand-warning)" }}>高危 {p.dangerCount}</span>
                    )}
                    {p.nextFocus && (
                      <span style={{ color: "var(--brand-blue)" }}>
                        改进重点已设定
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
