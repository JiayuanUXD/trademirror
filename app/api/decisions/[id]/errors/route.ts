import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  getErrorLogsByDecision,
  addErrorLog,
  deleteErrorLog,
} from "@/lib/db/queries/errors";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const logs = await getErrorLogsByDecision(id, userId);
  return NextResponse.json(logs);
}

export async function POST(req: Request, { params }: Params) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json() as {
    errorTypeId?: string;
    note?: string;
    cost?: number | null;
  };
  if (!body.errorTypeId) {
    return NextResponse.json({ error: "errorTypeId 必填" }, { status: 400 });
  }
  const log = await addErrorLog({
    errorTypeId: body.errorTypeId,
    decisionId: id,
    note: body.note,
    cost: body.cost,
  }, userId);
  return NextResponse.json(log, { status: 201 });
}

export async function DELETE(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const logId = url.searchParams.get("logId");
  if (!logId) {
    return NextResponse.json({ error: "logId 必填" }, { status: 400 });
  }
  await deleteErrorLog(logId, userId);
  return new NextResponse(null, { status: 204 });
}
