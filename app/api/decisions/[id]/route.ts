import { NextRequest, NextResponse } from "next/server";
import { getDecisionById, updateDecision } from "@/lib/db/queries/decisions";
import { z } from "zod";

const patchSchema = z.object({
  actualPrice: z.number().positive().nullable().optional(),
  priceAfter7Days: z.number().positive().nullable().optional(),
  priceAfter30Days: z.number().positive().nullable().optional(),
  return30Days: z.number().nullable().optional(),
  postReflection: z.string().max(500).nullable().optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const decision = await getDecisionById(id);
  if (!decision) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(decision);
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body: unknown = await req.json();
  const result = patchSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten() }, { status: 400 });
  }

  const patch = result.data;
  // Auto-compute return30Days if we now have both actualPrice and priceAfter30Days
  const existing = await getDecisionById(id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const costBasis = patch.actualPrice ?? existing.actualPrice;
  const p30 = patch.priceAfter30Days ?? existing.priceAfter30Days;
  if (costBasis && p30 && !("return30Days" in patch)) {
    patch.return30Days = Math.round(((p30 - costBasis) / costBasis) * 10000) / 100;
  }

  const updated = await updateDecision(id, patch);
  return NextResponse.json(updated);
}
