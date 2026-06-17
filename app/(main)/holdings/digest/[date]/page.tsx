import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { auth } from "@/auth";
import { getDigestByDate, listRecentDigests } from "@/lib/db/queries/digests";
import { DigestContent } from "@/components/holdings/digest-content";
import { DigestShareButton } from "@/components/holdings/digest-share-button";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ date: string }> };

export default async function DigestDetailPage({ params }: Props) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  const { date } = await params;

  // 验证日期格式
  if (!/^\d{8}$/.test(date)) notFound();

  const digest = await getDigestByDate(date, userId);
  if (!digest) notFound();

  // 获取最近的其他简报（用于历史导航）
  const recentDigests = await listRecentDigests(userId, 10);
  const otherDates = recentDigests
    .filter((d) => d.tradeDate !== date)
    .map((d) => d.tradeDate)
    .slice(0, 5);

  const dateStr = `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`;
  const weekDays = ["日", "一", "二", "三", "四", "五", "六"];
  const dateObj = new Date(Number(date.slice(0, 4)), Number(date.slice(4, 6)) - 1, Number(date.slice(6, 8)));
  const weekDay = weekDays[dateObj.getDay()];

  return (
    <div className="px-4 py-6 space-y-5">
      <Link
        href="/holdings"
        className="inline-flex items-center gap-1 text-xs transition-colors"
        style={{ color: "var(--muted-foreground)" }}
      >
        <ChevronLeft size={13} />
        持仓库
      </Link>

      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>
            盘后简报 · {dateStr}（周{weekDay}）
          </h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>
            基于技术指标和公开信息自动生成
          </p>
        </div>
        <DigestShareButton tradeDate={date} />
      </div>

      {/* 分析内容（Client Component 处理 markdown 渲染） */}
      <DigestContent
        digestText={digest.digestText}
        marketData={digest.marketData}
        stockAnalyses={digest.stockAnalyses}
      />

      {/* 免责声明 */}
      <div
        className="rounded-lg p-3 text-[11px] leading-relaxed"
        style={{ backgroundColor: "var(--surface-overlay)", color: "var(--muted-foreground)" }}
      >
        ⚠️ 以上分析基于技术指标和公开信息自动生成，仅供复盘参考，不构成任何投资建议。
        市场有风险，投资需谨慎。
      </div>

      {/* 历史简报 */}
      {otherDates.length > 0 && (
        <div
          className="rounded-xl border p-4"
          style={{ backgroundColor: "var(--surface-card)", borderColor: "var(--border-subtle)" }}
        >
          <p className="text-xs font-medium mb-2" style={{ color: "var(--muted-foreground)" }}>
            历史简报
          </p>
          <div className="flex flex-wrap gap-2">
            {otherDates.map((d) => (
              <Link
                key={d}
                href={`/holdings/digest/${d}`}
                className="text-xs px-2 py-1 rounded transition-colors hover:bg-[var(--surface-overlay)]"
                style={{ color: "var(--brand-primary)", border: "1px solid var(--border-subtle)" }}
              >
                {d.slice(4, 6)}-{d.slice(6, 8)}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
