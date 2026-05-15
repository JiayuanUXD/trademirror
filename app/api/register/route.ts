import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { z } from "zod";

const registerSchema = z.object({
  name: z.string().min(1).max(50),
  email: z.string().email(),
  password: z.string().min(8).regex(/[a-zA-Z]/, "需包含字母").regex(/[0-9]/, "需包含数字"),
});

export async function POST(req: NextRequest) {
  try {
    const body: unknown = await req.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const { name, email, password } = parsed.data;

    // Check duplicate email
    const [existing] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existing) {
      return NextResponse.json(
        { error: "该邮箱已注册" },
        { status: 409 }
      );
    }

    const hash = await bcrypt.hash(password, 12);
    const now = Date.now();

    await db.insert(users).values({
      id: crypto.randomUUID(),
      name,
      email,
      passwordHash: hash,
      role: "user",
      disabled: false,
      passwordChangedAt: now,
      createdAt: now,
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/register]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
