import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createHoldingSchema } from "@/lib/validators/holding";
import { createHolding, getHoldings } from "@/lib/db/queries/holdings";

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const list = await getHoldings(userId);
    return NextResponse.json(list);
  } catch (err) {
    console.error("[GET /api/holdings]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
      status: data.status ?? "WATCHING",
      // shares / costPrice computed from decisions at read time
      costPrice: 0,
      currentPrice: null,
      shares: 0,
      sector: data.sector ?? "",
      logic: initialLogic,
      prerequisites: [],
      exitConditions: [],
      createdAt: now,
      updatedAt: now,
    }, userId);

    return NextResponse.json(holding, { status: 201 });
  } catch (err) {
    console.error("[POST /api/holdings]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
