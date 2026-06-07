import { createClient } from "@libsql/client/node";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

/**
 * DB client.
 *
 * Local dev  → TURSO_DATABASE_URL is unset → uses file:local.db
 * Production → TURSO_DATABASE_URL = libsql://...turso.io
 */
const url = process.env.TURSO_DATABASE_URL ?? "file:local.db";
const authToken = process.env.TURSO_AUTH_TOKEN;

export const client = createClient({ url, authToken });
export const db = drizzle(client, { schema });
