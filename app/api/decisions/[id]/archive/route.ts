import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getDecisionById, archiveDecision } from "@/lib/db/queries/decisions";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(_req: NextRequest, { params }: Params) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    const existing = await getDecisionById(id, userId);
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (existing.status !== "ACTIVE") {
      return NextResponse.json({ error: "Decision is not active" }, { status: 409 });
    }

    const updated = await archiveDecision(id, userId);
    return NextResponse.json(updated);
  } catch (err) {
    console.error("[PATCH /api/decisions/[id]/archive]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
