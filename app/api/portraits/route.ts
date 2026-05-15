import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getPortraits, getPortraitByYearMonth, createPortrait } from "@/lib/db/queries/portraits";

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const list = await getPortraits(userId);
  return NextResponse.json(list);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as { year?: unknown; month?: unknown };
  const year = Number(body.year);
  const month = Number(body.month);
  if (!year || !month || month < 1 || month > 12) {
    return NextResponse.json({ error: "Invalid year/month" }, { status: 400 });
  }
  let portrait = await getPortraitByYearMonth(year, month, userId);
  if (!portrait) portrait = await createPortrait(year, month, userId);
  return NextResponse.json(portrait);
}
