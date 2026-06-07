/**
 * Next.js instrumentation hook — runs once on server cold-start.
 * https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
export async function register() {
  // Lock the server process timezone to Beijing time (China Standard Time),
  // so all server-side date math (new Date / dayjs / "today" / "this week")
  // is computed in 北京时间 regardless of the host timezone (Vercel runs UTC).
  // Node applies process.env.TZ changes at runtime via tzset().
  process.env.TZ = "Asia/Shanghai";

  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { runMigrations } = await import("./lib/db/migrate");
    await runMigrations();
  }
}
