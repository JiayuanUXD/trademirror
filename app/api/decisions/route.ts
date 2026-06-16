import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createDecisionSchema } from "@/lib/validators/decision";
import { createDecision, getDecisions, getDecisionsByStockCode } from "@/lib/db/queries/decisions";
import { calcDangerSignals } from "@/lib/danger-signals";
import { checkGuardrails, logGuardrailEvent } from "@/lib/guardrails";

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
    const isSellAction = ["SELL", "REDUCE", "CLEAR"].includes(data.action);
    const amount = Math.round(data.price * data.quantity * 100) / 100;
    const maxAcceptableLoss = isSellAction
      ? 0
      : Math.round(Math.abs(data.price - data.stopLossPrice) * data.quantity * 100) / 100;

    // 服务端护栏校验：blocking 命中直接拒绝（前端可能被绕过）
    const guardrails = await checkGuardrails({
      userId,
      action: data.action,
      stockCode: data.stockCode,
      price: data.price,
      quantity: data.quantity,
      stopLossPrice: isSellAction ? 0 : data.stopLossPrice,
    });
    const rawBodyForOverride = body as Record<string, unknown>;
    const overrideAck = rawBodyForOverride.guardrailOverride === true;
    const blocking = guardrails.filter((g) => g.blocking);
    const warnings = guardrails.filter((g) => !g.blocking);

    if (blocking.length > 0) {
      for (const hit of blocking) {
        await logGuardrailEvent(userId, hit, "BLOCKED", null, {
          stockCode: data.stockCode,
          quantity: data.quantity,
          price: data.price,
        });
      }
      return NextResponse.json(
        { error: "GUARDRAIL_BLOCKED", guardrails: blocking },
        { status: 422 }
      );
    }

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
      stockName: data.stockName.replace(/\s/g, ""),
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
      tradedAt: data.tradedAt ?? null,
      createdAt: Date.now(),
    }, userId);

    if (warnings.length > 0) {
      for (const hit of warnings) {
        await logGuardrailEvent(userId, hit, overrideAck ? "OVERRIDDEN" : "WARNED", decision.id, {
          stockCode: data.stockCode,
          quantity: data.quantity,
          price: data.price,
        });
      }
    }

    return NextResponse.json(decision, { status: 201 });
  } catch (err) {
    console.error("[POST /api/decisions]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
