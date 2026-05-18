import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  // Prevent self-role change
  if (session.user.id === id) {
    return NextResponse.json({ error: "Cannot change your own role" }, { status: 400 });
  }

  const [target] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!target) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Accept explicit role from body, fall back to toggle
  let newRole: string;
  try {
    const body = await req.json().catch(() => ({}));
    if (body.role === "admin" || body.role === "user") {
      newRole = body.role;
    } else {
      newRole = target.role === "admin" ? "user" : "admin";
    }
  } catch {
    newRole = target.role === "admin" ? "user" : "admin";
  }

  await db.update(users).set({ role: newRole }).where(eq(users.id, id));
  return NextResponse.json({ ok: true, role: newRole });
}
