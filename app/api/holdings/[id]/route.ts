import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { patchHoldingSchema } from "@/lib/validators/holding";
import { getHoldingById, updateHolding } from "@/lib/db/queries/holdings";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const holding = await getHoldingById(id, userId);
    if (!holding) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(holding);
  } catch (err) {
    console.error("[GET /api/holdings/[id]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const body: unknown = await req.json();
    const parsed = patchHoldingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const holding = await updateHolding(id, userId, {
      ...(data.status && { status: data.status }),
      ...(data.currentPrice !== undefined && { currentPrice: data.currentPrice }),
      ...(data.shares !== undefined && { shares: data.shares }),
      ...(data.costPrice !== undefined && { costPrice: data.costPrice }),
      ...(data.sector !== undefined && { sector: data.sector }),
      ...(data.reasons !== undefined || data.moat !== undefined || data.keyFinancials !== undefined
        ? {
            logic: {
              reasons: data.reasons ?? [],
              moat: data.moat ?? "",
              keyFinancials: data.keyFinancials ?? "",
              logicScore: 0,
            },
          }
        : {}),
      ...(data.prerequisites !== undefined && { prerequisites: data.prerequisites }),
      ...(data.exitConditions !== undefined && { exitConditions: data.exitConditions }),
    });

    return NextResponse.json(holding);
  } catch (err) {
    console.error("[PATCH /api/holdings/[id]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
