import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getPortraitById, updatePortrait } from "@/lib/db/queries/portraits";
import { z } from "zod";

import { PROBLEM_IDS } from "@/types/portrait";
import type { ProblemEvalItem } from "@/types/portrait";

const keyTradeItemSchema = z.object({
  decisionId: z.string().min(1),
  errorClassification: z.enum(["NEW", "OLD", ""]),
  errorTypeId: z.string().nullable().optional(),
  note: z.string().max(50).default(""),
});

const keyTradesSchema = z.object({
  success: keyTradeItemSchema.optional(),
  failure: keyTradeItemSchema.optional(),
  reflect: keyTradeItemSchema.optional(),
});

const patchSchema = z.object({
  reflection: z.string().max(500).optional(),
  nextFocus: z.string().optional(),
  problemEvals: z
    .array(
      z.object({
        id: z.enum(PROBLEM_IDS as [string, ...string[]]).transform((v) => v as any),
        eval: z.enum(["IMPROVED", "STABLE", "WORSENED"]).transform((v) => v as any),
      })
    )
    .optional(),
  keyTrades: keyTradesSchema.optional(),
  complete: z.boolean().optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const portrait = await getPortraitById(id, userId);
  if (!portrait) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(portrait);
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body: unknown = await req.json();
  const result = patchSchema.safeParse(body);
  if (!result.success) return NextResponse.json({ error: result.error.flatten() }, { status: 400 });

  if (result.data.complete) {
    const portrait = await getPortraitById(id, userId);
    if (!portrait) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (!result.data.reflection?.trim() && !portrait.reflection.trim()) {
      return NextResponse.json({ error: "请填写月度体悟后再完成" }, { status: 422 });
    }
    if (!result.data.nextFocus && !portrait.nextFocus) {
      return NextResponse.json({ error: "请选择下月改进重点后再完成" }, { status: 422 });
    }
  }

  const updated = await updatePortrait(id, userId, result.data);
  return NextResponse.json(updated);
}
