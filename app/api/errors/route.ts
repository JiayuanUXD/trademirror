import { NextResponse } from "next/server";
import { getErrorTypes, createErrorType } from "@/lib/db/queries/errors";

export async function GET() {
  const types = await getErrorTypes();
  return NextResponse.json(types);
}

export async function POST(req: Request) {
  const body = await req.json() as { name?: string; description?: string };
  if (!body.name?.trim()) {
    return NextResponse.json({ error: "错误类型名称不能为空" }, { status: 400 });
  }
  const type = await createErrorType(body.name.trim(), body.description?.trim() ?? "");
  return NextResponse.json(type, { status: 201 });
}
