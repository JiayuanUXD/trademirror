import { NextResponse } from "next/server";
import { getErrorLogsByType, addErrorLog } from "@/lib/db/queries/errors";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  const logs = await getErrorLogsByType(id);
  return NextResponse.json(logs);
}

export async function POST(req: Request, { params }: Params) {
  const { id } = await params;
  const body = await req.json() as { decisionId?: string; note?: string; cost?: number | null };
  const log = await addErrorLog({ errorTypeId: id, ...body });
  return NextResponse.json(log, { status: 201 });
}
