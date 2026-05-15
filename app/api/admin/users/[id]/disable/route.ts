import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const [target] = await db
    .select()
    .from(users)
    .where(eq(users.id, id))
    .limit(1);

  if (!target) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const newDisabled = !target.disabled;
  await db.update(users).set({ disabled: newDisabled }).where(eq(users.id, id));

  return NextResponse.json({ ok: true, disabled: newDisabled });
}
