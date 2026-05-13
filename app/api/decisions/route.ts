import { NextRequest, NextResponse } from "next/server";
import { createDecisionSchema } from "@/lib/validators/decision";
import { createDecision, getDecisions } from "@/lib/db/queries/decisions";
import { calcDangerSignals } from "@/lib/danger-signals";

export async function GET() {
  try {
    const list = await getDecisions();
    return NextResponse.json(list);
  } catch (err) {
    console.error("[GET /api/decisions]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
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
      isArchived: false,
      createdAt: Date.now(),
    });

    return NextResponse.json(decision, { status: 201 });
  } catch (err) {
    console.error("[POST /api/decisions]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
