import { NextResponse } from "next/server";
import { getGoals, createGoal } from "@/lib/db/queries/goals";

export async function GET() {
  const list = await getGoals();
  return NextResponse.json(list);
}

export async function POST(req: Request) {
  const body = await req.json() as {
    title?: string;
    startAmount?: number;
    targetAmount?: number;
    years?: number;
    note?: string;
  };

  if (!body.startAmount || !body.targetAmount || !body.years) {
    return NextResponse.json({ error: "startAmount、targetAmount、years 必填" }, { status: 400 });
  }
  if (body.startAmount <= 0 || body.targetAmount <= 0) {
    return NextResponse.json({ error: "金额必须大于0" }, { status: 400 });
  }
  if (body.years < 1 || body.years > 30) {
    return NextResponse.json({ error: "年数须在 1-30 之间" }, { status: 400 });
  }

  const goal = await createGoal({
    title: body.title ?? "",
    startAmount: body.startAmount,
    targetAmount: body.targetAmount,
    years: body.years,
    note: body.note,
  });
  return NextResponse.json(goal, { status: 201 });
}
