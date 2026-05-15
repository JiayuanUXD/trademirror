import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getErrorLogsByType, addErrorLog } from "@/lib/db/queries/errors";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const logs = await getErrorLogsByType(id, userId);
  return NextResponse.json(logs);
}

export async function POST(req: Request, { params }: Params) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json() as { decisionId?: string; note?: string; cost?: number | null };
  const log = await addErrorLog({ errorTypeId: id, ...body }, userId);
  return NextResponse.json(log, { status: 201 });
}
