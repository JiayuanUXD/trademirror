import { NextRequest, NextResponse } from "next/server";
import { getPortraitById, updatePortrait } from "@/lib/db/queries/portraits";
import { z } from "zod";

const PROBLEM_IDS = [
  "overleverage",
  "chasing_hot",
  "averaging_down",
  "no_profit_taking",
  "emotional_trading",
  "unrealistic_goals",
] as const;

const patchSchema = z.object({
  reflection: z.string().max(500).optional(),
  nextFocus: z.string().optional(),
  problemEvals: z
    .array(z.object({ id: z.enum(PROBLEM_IDS), eval: z.enum(["IMPROVED", "STABLE", "WORSENED"]) }))
    .optional(),
  complete: z.boolean().optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const portrait = await getPortraitById(id);
  if (!portrait) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(portrait);
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body: unknown = await req.json();
  const result = patchSchema.safeParse(body);
  if (!result.success) return NextResponse.json({ error: result.error.flatten() }, { status: 400 });

  if (result.data.complete) {
    const portrait = await getPortraitById(id);
    if (!portrait) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (!result.data.reflection?.trim() && !portrait.reflection.trim()) {
      return NextResponse.json({ error: "请填写月度体悟后再完成" }, { status: 422 });
    }
    if (!result.data.nextFocus && !portrait.nextFocus) {
      return NextResponse.json({ error: "请选择下月改进重点后再完成" }, { status: 422 });
    }
  }

  const updated = await updatePortrait(id, result.data);
  return NextResponse.json(updated);
}
