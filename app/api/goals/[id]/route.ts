import { NextResponse } from "next/server";
import { getGoalById, addCheckin, updateGoalStatus } from "@/lib/db/queries/goals";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  const goal = await getGoalById(id);
  if (!goal) return NextResponse.json({ error: "未找到" }, { status: 404 });
  return NextResponse.json(goal);
}

export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;
  const body = await req.json() as {
    checkin?: { amount: number; note?: string };
    status?: "ACTIVE" | "ACHIEVED" | "ABANDONED";
  };

  if (body.checkin) {
    if (!body.checkin.amount || body.checkin.amount <= 0) {
      return NextResponse.json({ error: "checkin.amount 必须大于0" }, { status: 400 });
    }
    const updated = await addCheckin(id, body.checkin.amount, body.checkin.note ?? "");
    return NextResponse.json(updated);
  }

  if (body.status) {
    await updateGoalStatus(id, body.status);
    return new NextResponse(null, { status: 204 });
  }

  return NextResponse.json({ error: "无有效操作" }, { status: 400 });
}
