import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { batchCreateDecisions, type BatchInsertDecision } from "@/lib/db/queries/decisions";
import { z } from "zod";
import { nanoid } from "nanoid";

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
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const items: BatchInsertDecision[] = parsed.data.trades.map((t) => ({
    id: nanoid(),
    stockCode: t.stockCode,
    stockName: t.stockName,
    stockMarket: t.stockMarket ?? inferMarket(t.stockCode),
    action: t.action,
    price: t.price,
    quantity: t.quantity,
    tradedAt: t.tradedAt ? new Date(t.tradedAt).getTime() : undefined,
  }));

  const result = await batchCreateDecisions(items, userId);

  const status = result.failed.length > 0 && result.created.length === 0 ? 500 : 207;
  return NextResponse.json(result, { status });
}
