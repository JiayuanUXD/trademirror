import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { batchCreateDecisions, type BatchInsertDecision } from "@/lib/db/queries/decisions";
import { db } from "@/lib/db";
import { decisions, holdings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

function inferMarket(code: string): "SH" | "SZ" | "BJ" {
  if (/^6/.test(code)) return "SH";
  if (/^(00|30)/.test(code)) return "SZ";
  if (/^(43|83|87)/.test(code)) return "BJ";
  return "SH";
}

const tradeSchema = z.object({
  stockCode: z.string().regex(/^\d{6}$/, "股票代码必须为 6 位数字"),
  stockName: z.string().min(1, "请填写股票名称").max(20),
  stockMarket: z.enum(["SH", "SZ", "BJ"]).optional(),
  action: z.enum(["BUY", "ADD", "SELL", "REDUCE", "CLEAR"]),
  price: z.number().positive("价格必须大于 0"),
  quantity: z.number().int().positive("数量必须大于 0"),
  tradedAt: z.string().nullable().optional(),
});

const batchSchema = z.object({
  trades: z.array(tradeSchema).min(1, "至少需要一条记录").max(50, "单次最多批量创建 50 条"),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body: unknown = await req.json();
  const parsed = batchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "参数校验失败" }, { status: 400 });
  }

  // Fetch existing stock codes from decisions + holdings to auto-upgrade BUY → ADD
  const [existingDecisions, existingHoldings] = await Promise.all([
    db.select({ stockCode: decisions.stockCode })
      .from(decisions)
      .where(eq(decisions.userId, userId)),
    db.select({ stockCode: holdings.stockCode })
      .from(holdings)
      .where(eq(holdings.userId, userId)),
  ]);
  const ownedStockCodes = new Set([
    ...existingDecisions.map((r) => r.stockCode),
    ...existingHoldings.map((r) => r.stockCode),
  ]);

  const items: BatchInsertDecision[] = parsed.data.trades.map((t) => ({
    id: crypto.randomUUID(),
    stockCode: t.stockCode,
    stockName: t.stockName,
    stockMarket: t.stockMarket ?? inferMarket(t.stockCode),
    // Auto-upgrade: BUY → ADD if this stock already has history
    action: t.action === "BUY" && ownedStockCodes.has(t.stockCode) ? "ADD" : t.action,
    price: t.price,
    quantity: t.quantity,
    tradedAt: t.tradedAt ? new Date(t.tradedAt).getTime() : undefined,
  }));

  const result = await batchCreateDecisions(items, userId);

  const status = result.failed.length > 0 && result.created.length === 0 ? 500 : 207;
  return NextResponse.json(result, { status });
}
