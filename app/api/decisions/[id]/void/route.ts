import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getDecisionById, voidDecision } from "@/lib/db/queries/decisions";
import { z } from "zod";
import type { VoidedReason } from "@/types/decision";

const GRACE_PERIOD_MS = 30 * 60 * 1000; // 30 minutes

const voidSchema = z.object({
  reason: z.enum(["INPUT_ERROR", "DUPLICATE", "NOT_MINE"]).optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    const body: unknown = await req.json();
    const parsed = voidSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "参数校验失败" }, { status: 400 });
    }

    const existing = await getDecisionById(id, userId);
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (existing.status !== "ACTIVE") {
      return NextResponse.json({ error: "Decision is not active" }, { status: 409 });
    }

    const now = Date.now();
    const withinGrace = now - existing.createdAt <= GRACE_PERIOD_MS;

    if (!withinGrace && !parsed.data.reason) {
      return NextResponse.json(
        { error: "reason is required after 30-minute grace period" },
        { status: 400 }
      );
    }

    // Within grace period, default reason to INPUT_ERROR if not provided
    const reason: VoidedReason = parsed.data.reason ?? "INPUT_ERROR";
    const updated = await voidDecision(id, userId, reason, now);
    return NextResponse.json(updated);
  } catch (err) {
    console.error("[PATCH /api/decisions/[id]/void]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
