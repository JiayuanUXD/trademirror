import { NextRequest, NextResponse } from "next/server";
import { getPortraits, getPortraitByYearMonth, createPortrait } from "@/lib/db/queries/portraits";

export async function GET() {
  const list = await getPortraits();
  return NextResponse.json(list);
}

export async function POST(req: NextRequest) {
  const body = await req.json() as { year?: unknown; month?: unknown };
  const year = Number(body.year);
  const month = Number(body.month);
  if (!year || !month || month < 1 || month > 12) {
    return NextResponse.json({ error: "Invalid year/month" }, { status: 400 });
  }
  let portrait = await getPortraitByYearMonth(year, month);
  if (!portrait) portrait = await createPortrait(year, month);
  return NextResponse.json(portrait);
}
