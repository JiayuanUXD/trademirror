import { NextResponse } from "next/server";
import { getAlertStats } from "@/lib/db/queries/alerts";

export async function GET() {
  const stats = await getAlertStats();
  return NextResponse.json(stats);
}
