import { NextRequest, NextResponse } from "next/server";
import { createHoldingSchema } from "@/lib/validators/holding";
import { createHolding, getHoldings } from "@/lib/db/queries/holdings";

export async function GET() {
  try {
    const list = await getHoldings();
    return NextResponse.json(list);
  } catch (err) {
    console.error("[GET /api/holdings]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body: unknown = await req.json();
    const parsed = createHoldingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const now = Date.now();
    const initialLogic = {
      reasons: data.initialReason
        ? [{ id: crypto.randomUUID(), content: data.initialReason, hasData: false, isVerifiable: false }]
        : [],
      moat: "",
      keyFinancials: "",
      logicScore: 0,
    };

    const holding = await createHolding({
      id: crypto.randomUUID(),
      stockCode: data.stockCode,
      stockName: data.stockName,
      stockMarket: data.stockMarket,
      status: data.status,
      costPrice: data.costPrice,
      currentPrice: null,
      shares: data.shares,
      sector: data.sector ?? "",
      logic: initialLogic,
      prerequisites: [],
      exitConditions: [],
      createdAt: now,
      updatedAt: now,
    });

    return NextResponse.json(holding, { status: 201 });
  } catch (err) {
    console.error("[POST /api/holdings]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
