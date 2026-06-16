import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getLatestSnapshot } from "@/lib/db/queries/screener";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const latest = await getLatestSnapshot(session.user.id);
    return NextResponse.json({ latest });
  } catch (err) {
    console.error("[GET /api/screener]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
