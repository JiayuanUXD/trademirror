import { NextResponse } from "next/server";
import {
  getErrorLogsByDecision,
  addErrorLog,
  deleteErrorLog,
} from "@/lib/db/queries/errors";

type Params = { params: Promise<{ id: string }> };

// GET /api/decisions/[id]/errors → error logs for this decision
export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  const logs = await getErrorLogsByDecision(id);
  return NextResponse.json(logs);
}

// POST /api/decisions/[id]/errors → link an error type to this decision
export async function POST(req: Request, { params }: Params) {
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
  });
  return NextResponse.json(log, { status: 201 });
}

// DELETE /api/decisions/[id]/errors?logId=xxx → unlink
export async function DELETE(req: Request) {
  const url = new URL(req.url);
  const logId = url.searchParams.get("logId");
  if (!logId) {
    return NextResponse.json({ error: "logId 必填" }, { status: 400 });
  }
  await deleteErrorLog(logId);
  return new NextResponse(null, { status: 204 });
}
