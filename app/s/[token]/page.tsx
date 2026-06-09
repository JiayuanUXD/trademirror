import { notFound } from "next/navigation";
import Link from "next/link";
import { getDigestShare } from "@/lib/db/queries/digests";
import { DigestContent } from "@/components/holdings/digest-content";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ token: string }> };

export default async function SharedDigestPage({ params }: Props) {
  const { token } = await params;

  const share = await getDigestShare(token);
  if (!share) notFound();

  // 检查过期
  if (share.expiresAt && share.expiresAt < Date.now()) notFound();

  const d = share.tradeDate;
  const dateStr = `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
  const weekDays = ["日", "一", "二", "三", "四", "五", "六"];
  const dateObj = new Date(Number(d.slice(0, 4)), Number(d.slice(4, 6)) - 1, Number(d.slice(6, 8)));
  const weekDay = weekDays[dateObj.getDay()];

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: "var(--background)", color: "var(--foreground)" }}
    >
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {/* Brand header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold" style={{ color: "var(--foreground)" }}>
              盘后简报 · {dateStr}（周{weekDay}）
            </h1>
            <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>
              来自 TradeMirror · 基于技术指标自动生成
            </p>
          </div>
          <Link
            href="/"
            className="text-[11px] px-2.5 py-1 rounded-md transition-colors hover:opacity-80"
            style={{ backgroundColor: "var(--surface-overlay)", color: "var(--brand-blue)", border: "1px solid var(--border-subtle)" }}
          >
            了解 TradeMirror
          </Link>
        </div>

        {/* Content */}
        <DigestContent
          digestText={share.digestText}
          marketData={share.marketData}
          stockAnalyses={share.stockAnalyses}
        />

        {/* Disclaimer */}
        <div
          className="rounded-lg p-3 text-[11px] leading-relaxed"
          style={{ backgroundColor: "var(--surface-overlay)", color: "var(--muted-foreground)" }}
        >
          以上分析基于技术指标和公开信息自动生成，仅供复盘参考，不构成任何投资建议。
          市场有风险，投资需谨慎。
        </div>
      </div>
    </div>
  );
}
