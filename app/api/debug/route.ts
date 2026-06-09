import { NextResponse } from "next/server";
import { client } from "@/lib/db/index";

export const dynamic = "force-dynamic";

/** GET /api/debug — temporary diagnostic endpoint */
export async function GET() {
  const results: Record<string, string> = {};

  // Test 1: basic connection
  try {
    const r = await client.execute("SELECT 1 as ok");
    results["connection"] = `OK (${JSON.stringify(r.rows[0])})`;
  } catch (e: unknown) {
    results["connection"] = `FAIL: ${(e as Error).message}`;
  }

  // Test 2: list tables
  try {
    const r = await client.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
    results["tables"] = r.rows.map((row) => row.name).join(", ");
  } catch (e: unknown) {
    results["tables"] = `FAIL: ${(e as Error).message}`;
  }

  // Test 3: run migration
  try {
    const { runMigrations } = await import("@/lib/db/migrate");
    await runMigrations();
    results["migration"] = "OK";
  } catch (e: unknown) {
    results["migration"] = `FAIL: ${(e as Error).message}\n${(e as Error).stack}`;
  }

  // Test 4: query decisions
  try {
    const r = await client.execute("SELECT count(*) as cnt FROM decisions");
    results["decisions_count"] = String(r.rows[0]?.cnt);
  } catch (e: unknown) {
    results["decisions_count"] = `FAIL: ${(e as Error).message}`;
  }

  // Test 5: Drizzle select
  try {
    const { db } = await import("@/lib/db/index");
    const { decisions } = await import("@/lib/db/schema");
    const { eq } = await import("drizzle-orm");
    const rows = await db.select().from(decisions).where(eq(decisions.userId, "jiayuan")).limit(1);
    results["drizzle_select"] = `OK (${rows.length} rows)`;
  } catch (e: unknown) {
    results["drizzle_select"] = `FAIL: ${(e as Error).message}`;
  }

  return NextResponse.json(results, { status: 200 });
}
