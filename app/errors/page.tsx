import { getErrorTypes } from "@/lib/db/queries/errors";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { ErrorLibraryClient } from "@/components/errors/error-library-client";
import dayjs from "dayjs";

export const dynamic = "force-dynamic";

function TrendIcon({ trend }: { trend: "INCREASING" | "STABLE" | "DECREASING" }) {
  if (trend === "INCREASING") return <TrendingUp size={14} style={{ color: "var(--brand-red)" }} />;
  if (trend === "DECREASING") return <TrendingDown size={14} style={{ color: "var(--brand-green)" }} />;
  return <Minus size={14} style={{ color: "var(--muted-foreground)" }} />;
}

function TrendLabel({ trend }: { trend: "INCREASING" | "STABLE" | "DECREASING" }) {
  const map = { INCREASING: "仍在重复", STABLE: "持平", DECREASING: "减少中" };
  const colorMap = {
    INCREASING: "var(--brand-red)",
    STABLE: "var(--muted-foreground)",
    DECREASING: "var(--brand-green)",
  };
  return (
    <span className="text-xs" style={{ color: colorMap[trend] }}>
      {map[trend]}
    </span>
  );
}

export default async function ErrorsPage() {
  const types = await getErrorTypes();

  // Sort: most occurrences first, then by total cost (most negative)
  const sorted = [...types].sort((a, b) => {
    if (b.occurrences !== a.occurrences) return b.occurrences - a.occurrences;
    const ca = a.totalCost ?? 0;
    const cb = b.totalCost ?? 0;
    return ca - cb; // more negative = higher up
  });

  const totalOccurrences = types.reduce((s, t) => s + t.occurrences, 0);
  const totalCost = types.reduce((s, t) => s + (t.totalCost ?? 0), 0);

  return (
    <div className="px-4 py-5 sm:px-6 sm:py-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>
            错误类型库
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--muted-foreground)" }}>
            你的个人病历本 · 看见重复，才能真正改变
          </p>
        </div>
        <ErrorLibraryClient />
      </div>

      {/* Summary */}
      {totalOccurrences > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div
            className="rounded-xl border px-4 py-3"
            style={{ backgroundColor: "var(--surface-card)", borderColor: "var(--border-subtle)" }}
          >
            <div className="text-2xl font-bold" style={{ color: "var(--brand-red)" }}>
              {totalOccurrences}
            </div>
            <div className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>
              累计错误次数
            </div>
          </div>
          <div
            className="rounded-xl border px-4 py-3"
            style={{ backgroundColor: "var(--surface-card)", borderColor: "var(--border-subtle)" }}
          >
            <div
              className="text-2xl font-bold"
              style={{ color: totalCost < 0 ? "var(--brand-red)" : "var(--muted-foreground)" }}
            >
              {totalCost < 0 ? `-¥${Math.abs(totalCost).toLocaleString()}` : "—"}
            </div>
            <div className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>
              可计算亏损合计
            </div>
          </div>
        </div>
      )}

      {/* Error type list */}
      <div className="space-y-2">
        {sorted.map((t) => (
          <div
            key={t.id}
            className="rounded-xl border p-4"
            style={{ backgroundColor: "var(--surface-card)", borderColor: "var(--border-subtle)" }}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0" style={{ minWidth: "6rem" }}>
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className="text-sm font-semibold whitespace-nowrap"
                    style={{ color: "var(--foreground)" }}
                  >
                    {t.name}
                  </span>
                  {t.isPreset && (
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded"
                      style={{
                        backgroundColor: "var(--surface-overlay)",
                        color: "var(--muted-foreground)",
                      }}
                    >
                      预置
                    </span>
                  )}
                </div>
                {t.description && (
                  <p
                    className="text-xs mt-0.5 truncate"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    {t.description}
                  </p>
                )}
              </div>

              {/* Stats */}
              <div className="flex items-center gap-4 shrink-0 flex-wrap justify-end">
                <div className="text-right">
                  <div
                    className="text-lg font-bold"
                    style={{ color: t.occurrences > 0 ? "var(--brand-red)" : "var(--muted-foreground)" }}
                  >
                    {t.occurrences}
                  </div>
                  <div className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>
                    次
                  </div>
                </div>

                <div className="text-right">
                  <div
                    className="text-sm font-medium"
                    style={{ color: t.totalCost && t.totalCost < 0 ? "var(--brand-red)" : "var(--muted-foreground)" }}
                  >
                    {t.totalCost !== null && t.totalCost < 0
                      ? `-¥${Math.abs(t.totalCost).toLocaleString()}`
                      : "—"}
                  </div>
                  <div className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>
                    累计代价
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[11px]" style={{ color: "var(--muted-foreground)" }}>
                    {t.lastOccurredAt ? dayjs(t.lastOccurredAt).format("MM/DD") : "—"}
                  </div>
                  <div className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>
                    最近一次
                  </div>
                </div>

                <div className="flex flex-col items-center gap-0.5">
                  <TrendIcon trend={t.trend} />
                  <TrendLabel trend={t.trend} />
                </div>
              </div>
            </div>
          </div>
        ))}

        {sorted.length === 0 && (
          <div
            className="rounded-xl border py-16 text-center"
            style={{ backgroundColor: "var(--surface-card)", borderColor: "var(--border-subtle)" }}
          >
            <p className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
              还没有错误记录
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>
              在决策详情页标记错误类型，系统会自动汇总到这里
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
