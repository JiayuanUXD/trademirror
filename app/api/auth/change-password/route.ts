import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { z } from "zod";

const schema = z.object({
  password: z.string().min(8).regex(/[a-zA-Z]/, "需包含字母").regex(/[0-9]/, "需包含数字"),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body: unknown = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "密码格式不符合要求" }, { status: 400 });
    }

    const hash = await bcrypt.hash(parsed.data.password, 12);
    await db
      .update(users)
      .set({ passwordHash: hash, passwordChangedAt: Date.now() })
      .where(eq(users.id, userId));

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[POST /api/auth/change-password]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
