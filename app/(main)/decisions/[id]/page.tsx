import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, AlertTriangle } from "lucide-react";
import { auth } from "@/auth";
import { getDecisionById } from "@/lib/db/queries/decisions";
import { getErrorLogsByDecision, getErrorTypes } from "@/lib/db/queries/errors";
import { withRetry } from "@/lib/db/retry";
import { DecisionTracking } from "@/components/decisions/decision-tracking";
import { ErrorTagger } from "@/components/errors/error-tagger";
import { ACTION_LABELS, RATIONAL_BASIS, ALIGNMENT_LABELS } from "@/types/decision";
import dayjs from "dayjs";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] mb-0.5" style={{ color: "var(--muted-foreground)" }}>{label}</div>
      <div className="text-sm" style={{ color: "var(--foreground)" }}>{value}</div>
    </div>
  );
}

function ScoreBadge({ value, invert = false }: { value: number; invert?: boolean }) {
  const bad = invert ? value >= 7 : value <= 4;
  const good = invert ? value < 5 : value >= 7;
  const color = bad ? "var(--brand-red)" : good ? "var(--brand-green)" : "var(--brand-warning)";
  return (
    <span
      className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-sm font-bold"
      style={{ backgroundColor: `${color}22`, color }}
    >
      {value}
    </span>
  );
}

export default async function DecisionDetailPage({ params }: Props) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/login");

  const { id } = await params;
  const [decision, errorLogs, allErrorTypes] = await withRetry(() =>
    Promise.all([
      getDecisionById(id, userId),
      getErrorLogsByDecision(id, userId),
      getErrorTypes(userId),
    ])
  );
  if (!decision) notFound();

  const isBuy = decision.action === "BUY" || decision.action === "ADD";
  const actionColor = isBuy ? "var(--brand-red)" : "var(--brand-green)";
  const hasDanger = decision.dangerSignals.length > 0;

  const alignmentColors: Record<string, string> = {
    ALIGN: "var(--brand-green)",
    PARTIAL: "var(--brand-warning)",
    NOT_ALIGN: "var(--brand-red)",
  };

  return (
    <div className="px-4 py-6 space-y-5">
      {/* Back */}
      <Link
        href="/decisions"
        className="inline-flex items-center gap-1 text-xs transition-colors"
        style={{ color: "var(--muted-foreground)" }}
      >
        <ChevronLeft size={13} />
        决策卡列表
      </Link>

      {/* Header */}
      <div className="flex items-start gap-3">
        <span
          className="text-[11px] font-bold px-2 py-0.5 rounded shrink-0 mt-0.5"
          style={{ backgroundColor: `${actionColor}22`, color: actionColor }}
        >
          {ACTION_LABELS[decision.action]}
        </span>
        <div>
          <h1 className="text-lg font-bold" style={{ color: "var(--foreground)" }}>
            {decision.stockName}
            <span className="text-sm font-normal ml-2" style={{ color: "var(--muted-foreground)" }}>
              {decision.stockCode}
            </span>
          </h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>
            {dayjs(decision.createdAt).format("YYYY年MM月DD日 HH:mm")}
          </p>
        </div>
      </div>

      {/* Danger banner */}
      {hasDanger && (
        <div
          className="flex items-start gap-2 px-4 py-3 rounded-lg border"
          style={{ backgroundColor: "rgba(245,158,11,0.07)", borderColor: "rgba(245,158,11,0.3)" }}
        >
          <AlertTriangle size={15} className="shrink-0 mt-0.5" style={{ color: "var(--brand-warning)" }} />
          <div>
            <p className="text-sm font-medium" style={{ color: "var(--brand-warning)" }}>
              系统检测到危险信号
            </p>
            <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>
              {decision.dangerSignals.join(" · ")}
            </p>
          </div>
        </div>
      )}

      {/* Core fields */}
      <div
        className="rounded-xl border p-4 space-y-4"
        style={{ backgroundColor: "var(--surface-card)", borderColor: "var(--border-subtle)" }}
      >
        <h2 className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>
          交易基础
        </h2>
        <div className="grid grid-cols-3 gap-x-4 gap-y-3">
          <Field label="计划价格" value={`¥${decision.price}`} />
          <Field label="数量" value={`${decision.quantity.toLocaleString()} 股`} />
          <Field label="金额" value={`¥${decision.amount.toLocaleString()}`} />
          <Field label="止损价" value={`¥${decision.stopLossPrice}`} />
          <Field label="最大可亏" value={`¥${decision.maxAcceptableLoss.toLocaleString()}`} />
          <Field
            label="符合体系"
            value={
              <span style={{ color: alignmentColors[decision.systemAlignment] }}>
                {ALIGNMENT_LABELS[decision.systemAlignment]}
              </span>
            }
          />
        </div>
        <div>
          <div className="text-[11px] mb-1" style={{ color: "var(--muted-foreground)" }}>一句话理由</div>
          <p className="text-sm" style={{ color: "var(--foreground)" }}>{decision.reason}</p>
        </div>
      </div>

      {/* Basis & emotion */}
      <div
        className="rounded-xl border p-4 space-y-4"
        style={{ backgroundColor: "var(--surface-card)", borderColor: "var(--border-subtle)" }}
      >
        <h2 className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>
          决策依据与情绪
        </h2>
        <div>
          <div className="text-[11px] mb-2" style={{ color: "var(--muted-foreground)" }}>决策依据</div>
          <div className="flex flex-wrap gap-1.5">
            {decision.basis.map((b) => {
              const isRational = (RATIONAL_BASIS as string[]).includes(b);
              const color = isRational ? "var(--brand-green)" : "var(--brand-red)";
              return (
                <span
                  key={b}
                  className="text-[11px] px-2 py-0.5 rounded"
                  style={{ backgroundColor: `${color}22`, color }}
                >
                  {b}
                </span>
              );
            })}
          </div>
        </div>
        <div className="flex gap-6">
          <div className="text-center">
            <div className="text-[11px] mb-1.5" style={{ color: "var(--muted-foreground)" }}>平静度</div>
            <ScoreBadge value={decision.calmScore} />
          </div>
          <div className="text-center">
            <div className="text-[11px] mb-1.5" style={{ color: "var(--muted-foreground)" }}>信心度</div>
            <ScoreBadge value={decision.confidenceScore} />
          </div>
          <div className="text-center">
            <div className="text-[11px] mb-1.5" style={{ color: "var(--muted-foreground)" }}>FOMO</div>
            <ScoreBadge value={decision.fomoScore} invert />
          </div>
        </div>
      </div>

      {/* Tracking + reflection (client) */}
      <div
        className="rounded-xl border p-4"
        style={{ backgroundColor: "var(--surface-card)", borderColor: "var(--border-subtle)" }}
      >
        <DecisionTracking decision={decision} />
      </div>

      {/* Error tagging (client) */}
      <div
        className="rounded-xl border p-4"
        style={{ backgroundColor: "var(--surface-card)", borderColor: "var(--border-subtle)" }}
      >
        <ErrorTagger
          decisionId={decision.id}
          decisionAmount={decision.amount}
          return30Days={decision.return30Days ?? null}
          initialLogs={errorLogs}
          allErrorTypes={allErrorTypes}
        />
      </div>
    </div>
  );
}
