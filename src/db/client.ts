import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const url = process.env.DATABASE_URL;

if (!url) {
  throw new Error(
    "DATABASE_URL is not set. Start the local Postgres with `docker compose up -d` " +
      "then add DATABASE_URL=postgres://dailyquest:dailyquest@localhost:5432/dailyquest to .env.local",
  );
}

// Hosted Postgres providers (Railway, Neon, Supabase, RDS) require TLS.
// We detect by environment, the explicit sslmode hint in the URL, or the
// hostname not being localhost. Local docker stays plaintext.
function needsSsl(connStr: string): boolean {
  // Localhost always wins, even under NODE_ENV=production, so local prod
  // tests work against docker without TLS misconfigured.
  try {
    const host = new URL(connStr).hostname;
    if (host === "localhost" || host === "127.0.0.1") return false;
  } catch {
    return false;
  }
  if (process.env.NODE_ENV === "production") return true;
  if (/sslmode=require|sslmode=verify-full|sslmode=verify-ca/i.test(connStr)) return true;
  return true;
}

declare global {
  // eslint-disable-next-line no-var
  var __dq_pg: ReturnType<typeof postgres> | undefined;
  // eslint-disable-next-line no-var
  var __dq_db: ReturnType<typeof drizzle<typeof schema>> | undefined;
}

const client =
  globalThis.__dq_pg ??
  postgres(url, {
    max: 5,
    prepare: false,
    ssl: needsSsl(url) ? "require" : false,
  });
if (!globalThis.__dq_pg) globalThis.__dq_pg = client;

export const db = globalThis.__dq_db ?? drizzle(client, { schema });
if (!globalThis.__dq_db) globalThis.__dq_db = db;
