import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getVerificationStats } from "@/lib/db/queries/screener";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const stats = await getVerificationStats(session.user.id);
    return NextResponse.json(stats);
  } catch (err) {
    console.error("[GET /api/screener/stats]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
