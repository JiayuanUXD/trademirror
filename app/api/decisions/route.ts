import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createDecisionSchema } from "@/lib/validators/decision";
import { createDecision, getDecisions, getDecisionsByStockCode } from "@/lib/db/queries/decisions";
import { calcDangerSignals } from "@/lib/danger-signals";
import type { DecisionStatus } from "@/types/decision";

async function getUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

export async function GET(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    // Shortcut: return all decisions for a specific stock code
    const stockCodeParam = req.nextUrl.searchParams.get("stockCode");
    if (stockCodeParam) {
      const list = await getDecisionsByStockCode(stockCodeParam, userId);
      return NextResponse.json(list);
    }

    const statusParam = req.nextUrl.searchParams.get("status") as string | null;
    const validStatuses = ["ACTIVE", "VOIDED", "ARCHIVED", "ALL"] as const;
    const status = statusParam && validStatuses.includes(statusParam as typeof validStatuses[number])
      ? statusParam as "ACTIVE" | "VOIDED" | "ARCHIVED" | "ALL"
      : "ACTIVE";

    const list = await getDecisions(userId, { status });
    return NextResponse.json(list);
  } catch (err) {
    console.error("[GET /api/decisions]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body: unknown = await req.json();
    const parsed = createDecisionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const amount = Math.round(data.price * data.quantity * 100) / 100;
    const maxAcceptableLoss =
      Math.round(Math.abs(data.price - data.stopLossPrice) * data.quantity * 100) / 100;

    const dangerSignals = calcDangerSignals({
      fomoScore: data.fomoScore,
      calmScore: data.calmScore,
      systemAlignment: data.systemAlignment,
      basis: data.basis,
    });

    const rawBody = body as Record<string, unknown>;

    const decision = await createDecision({
      id: crypto.randomUUID(),
      stockCode: data.stockCode,
      stockName: data.stockName,
      stockMarket: data.stockMarket,
      action: data.action,
      price: data.price,
      quantity: data.quantity,
      amount,
      reason: data.reason,
      basis: data.basis,
      systemAlignment: data.systemAlignment,
      calmScore: data.calmScore,
      confidenceScore: data.confidenceScore,
      fomoScore: data.fomoScore,
      stopLossPrice: data.stopLossPrice,
      maxAcceptableLoss,
      dangerSignals,
      parentId: (rawBody.parentId as string) ?? null,
      createdAt: data.tradedAt || Date.now(),
    }, userId);

    return NextResponse.json(decision, { status: 201 });
  } catch (err) {
    console.error("[POST /api/decisions]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
