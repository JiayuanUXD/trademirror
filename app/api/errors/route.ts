import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getErrorTypes, createErrorType } from "@/lib/db/queries/errors";

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const types = await getErrorTypes(userId);
  return NextResponse.json(types);
}

export async function POST(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as { name?: string; description?: string };
  if (!body.name?.trim()) {
    return NextResponse.json({ error: "错误类型名称不能为空" }, { status: 400 });
  }
  const type = await createErrorType(body.name.trim(), body.description?.trim() ?? "", userId);
  return NextResponse.json(type, { status: 201 });
}
