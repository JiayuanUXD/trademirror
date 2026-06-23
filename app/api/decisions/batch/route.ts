import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { batchCreateDecisions, type BatchInsertDecision } from "@/lib/db/queries/decisions";
import { db } from "@/lib/db";
import { decisions, holdings } from "@/lib/db/schema";
import { eq, and, inArray, ne } from "drizzle-orm";
import { z } from "zod";

function inferMarket(code: string): "SH" | "SZ" | "BJ" {
  if (/^6/.test(code)) return "SH";
  if (/^(00|30)/.test(code)) return "SZ";
  if (/^(43|83|87)/.test(code)) return "BJ";
  return "SH";
}

async function verifyStockCode(name: string, ocrCode: string): Promise<{ code: string; market: "SH" | "SZ" | "BJ" } | null> {
  try {
    const url = `https://searchapi.eastmoney.com/api/suggest/get?input=${encodeURIComponent(name)}&type=14&token=D43BF722C8E33BDC906FB84D85E326E8&count=5`;
    const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return null;
    const data = await res.json();
    const items = data?.QuotationCodeTable?.Data;
    if (!Array.isArray(items)) return null;
    const match = items.find((item: { Name: string; SecurityTypeName: string }) =>
      item.Name === name && (item.SecurityTypeName === "沪A" || item.SecurityTypeName === "深A" || item.SecurityTypeName === "京A")
    );
    if (!match) return null;
    if (match.Code === ocrCode) return null;
    return { code: match.Code, market: inferMarket(match.Code) };
  } catch {
    return null;
  }
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

  // Dedup: fetch existing decisions with same stock codes to skip duplicates
  const incomingCodes = [...new Set(parsed.data.trades.map((t) => t.stockCode))];
  const existingRows = incomingCodes.length > 0
    ? await db
        .select({
          stockCode: decisions.stockCode,
          action: decisions.action,
          price: decisions.price,
          quantity: decisions.quantity,
          tradedAt: decisions.tradedAt,
        })
        .from(decisions)
        .where(
          and(
            eq(decisions.userId, userId),
            ne(decisions.status, "VOIDED"),
            inArray(decisions.stockCode, incomingCodes),
          )
        )
    : [];
  const existingKeys = new Set(
    existingRows.map((r) => `${r.stockCode}|${r.action}|${r.price}|${r.quantity}|${r.tradedAt ?? ""}`)
  );

  const dedupedTrades = parsed.data.trades.filter((t) => {
    const ts = t.tradedAt ? new Date(t.tradedAt).getTime() : "";
    const key = `${t.stockCode}|${t.action}|${t.price}|${t.quantity}|${ts}`;
    return !existingKeys.has(key);
  });

  const skippedCount = parsed.data.trades.length - dedupedTrades.length;

  if (dedupedTrades.length === 0) {
    return NextResponse.json({
      created: [],
      failed: [],
      skipped: skippedCount,
      message: `${skippedCount} 条记录与已有决策卡重复，已全部跳过`,
    });
  }

  // 用股票名反查正确代码，纠正 OCR 识别错误
  const uniqueNames = [...new Set(dedupedTrades.map((t) => `${t.stockName}|${t.stockCode}`))];
  const corrections = new Map<string, { code: string; market: "SH" | "SZ" | "BJ" }>();
  await Promise.all(
    uniqueNames.map(async (key) => {
      const [name, code] = key.split("|");
      const fix = await verifyStockCode(name, code);
      if (fix) corrections.set(code + "|" + name, fix);
    })
  );

  const items: BatchInsertDecision[] = dedupedTrades.map((t) => {
    const fix = corrections.get(t.stockCode + "|" + t.stockName.replace(/\s/g, ""));
    const stockCode = fix?.code ?? t.stockCode;
    const stockMarket = fix?.market ?? t.stockMarket ?? inferMarket(t.stockCode);
    return {
      id: crypto.randomUUID(),
      stockCode,
      stockName: t.stockName.replace(/\s/g, ""),
      stockMarket,
      action: t.action === "BUY" && ownedStockCodes.has(stockCode) ? "ADD" : t.action,
      price: t.price,
      quantity: t.quantity,
      tradedAt: t.tradedAt ? new Date(t.tradedAt).getTime() : undefined,
    };
  });

  const result = await batchCreateDecisions(items, userId);

  const corrected = [...corrections.entries()].map(([key, fix]) => {
    const [oldCode, name] = key.split("|");
    return { stockName: name, oldCode, newCode: fix.code };
  });

  const status = result.failed.length > 0 && result.created.length === 0 ? 500 : 207;
  return NextResponse.json({ ...result, skipped: skippedCount, corrected }, { status });
}
