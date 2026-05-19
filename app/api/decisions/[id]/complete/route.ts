import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { z } from "zod";
import { getDecisionById, completeDecision } from "@/lib/db/queries/decisions";
import { calcDangerSignals } from "@/lib/danger-signals";
import type { DecisionBasis } from "@/types/decision";

const completeSchema = z.object({
  reason: z.string().min(1, "请填写决策理由"),
  basis: z.array(z.string()).min(1, "请至少选择一项决策依据"),
  systemAlignment: z.enum(["ALIGN", "PARTIAL", "NOT_ALIGN"]),
  calmScore: z.number().int().min(1).max(10),
  confidenceScore: z.number().int().min(1).max(10),
  fomoScore: z.number().int().min(1).max(10),
  stopLossPrice: z.number().positive("止损价必须大于 0"),
});

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const existing = await getDecisionById(id, userId);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!existing.incomplete) return NextResponse.json({ error: "Decision is already complete" }, { status: 409 });

  const body: unknown = await req.json();
  const parsed = completeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const maxAcceptableLoss = Math.round(
    Math.abs(existing.price - data.stopLossPrice) * existing.quantity * 100
  ) / 100;

  const basis = data.basis as DecisionBasis[];
  const dangerSignals = calcDangerSignals({
    fomoScore: data.fomoScore,
    calmScore: data.calmScore,
    systemAlignment: data.systemAlignment,
    basis,
  });

  const updated = await completeDecision(id, userId, {
    reason: data.reason,
    basis,
    systemAlignment: data.systemAlignment,
    calmScore: data.calmScore,
    confidenceScore: data.confidenceScore,
    fomoScore: data.fomoScore,
    stopLossPrice: data.stopLossPrice,
    maxAcceptableLoss,
    dangerSignals,
  });

  return NextResponse.json(updated);
}
