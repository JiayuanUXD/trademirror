import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  getCalmStats,
  getFomoStats,
  getMostRecentDecision,
  getNotAlignThisMonth,
} from "@/lib/db/queries/danger-stats";

const preCheckSchema = z.object({
  fomoScore: z.number().min(1).max(10),
  calmScore: z.number().min(1).max(10),
  systemAlignment: z.enum(["ALIGN", "PARTIAL", "NOT_ALIGN"]),
});

export type DangerAlertSignal =
  | "FOMO_HIGH"
  | "CALM_LOW"
  | "NOT_ALIGN"
  | "FREQUENT";

export type DangerAlert = {
  signal: DangerAlertSignal;
  title: string;
  message: string;
  /** "你过去 14 次操作有 10 次亏损" 这类用户自己的历史数据 */
  history: string | null;
};

const FREQUENT_THRESHOLD_MIN = 120;

export async function POST(req: NextRequest) {
  try {
    const body: unknown = await req.json();
    const parsed = preCheckSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const { fomoScore, calmScore, systemAlignment } = parsed.data;
    const alerts: DangerAlert[] = [];

    if (fomoScore >= 7) {
      const stats = await getFomoStats();
      alerts.push({
        signal: "FOMO_HIGH",
        title: "FOMO 评分偏高",
        message: "怕错过的情绪是 A 股散户最常见的亏损来源。",
        history:
          stats.total === 0
            ? "你之前还没有 FOMO≥7 的已完成交易作为参考。"
            : `你过去 FOMO≥7 的 ${stats.total} 次操作中 ${stats.losses} 次亏损（${Math.round(stats.lossRate * 100)}%）。`,
      });
    }

    if (calmScore <= 4) {
      const stats = await getCalmStats();
      alerts.push({
        signal: "CALM_LOW",
        title: "心态不稳",
        message: "建议把这笔交易加入观察清单，明早 9:30 前再决定。",
        history:
          stats.total === 0
            ? "你之前还没有平静度≤4 的已完成交易作为参考。"
            : `你过去平静度≤4 的 ${stats.total} 次操作中 ${stats.losses} 次亏损（${Math.round(stats.lossRate * 100)}%）。`,
      });
    }

    if (systemAlignment === "NOT_ALIGN") {
      const stats = await getNotAlignThisMonth();
      const note =
        stats.total === 0
          ? "本月还没有其他不符合体系的操作——不要让这笔成为开头。"
          : `本月你已有 ${stats.total} 笔不符合体系的操作${stats.losses > 0 ? `，其中 ${stats.losses} 笔已亏损` : ""}。`;
      alerts.push({
        signal: "NOT_ALIGN",
        title: "不符合你的交易体系",
        message: "超出体系的操作长期来看是负贡献。",
        history: note,
      });
    }

    const recent = await getMostRecentDecision();
    if (recent && recent.minutesAgo < FREQUENT_THRESHOLD_MIN) {
      alerts.push({
        signal: "FREQUENT",
        title: "短时间内频繁操作",
        message: "频繁操作是过去 6 年最常见的失误模式之一。",
        history: `你 ${recent.minutesAgo} 分钟前刚操作过「${recent.stockName}」。`,
      });
    }

    return NextResponse.json({ alerts });
  } catch (err) {
    console.error("[POST /api/decisions/pre-check]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
