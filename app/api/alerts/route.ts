import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getAlertStats } from "@/lib/db/queries/alerts";

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const stats = await getAlertStats(userId);
  return NextResponse.json(stats);
}
