// Production-safe migrator. Uses drizzle-orm's runtime migrator (a regular
// dependency) so it works in environments where devDependencies like
// drizzle-kit are not installed (e.g. NODE_ENV=production npm ci).
//
// Runs at container start on Railway, where the private DNS
// (postgres.railway.internal) resolves. Building the migration *during*
// the build phase fails with ENOTFOUND because build containers can't
// reach the runtime network.

import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("[migrate] DATABASE_URL is not set — skipping migrations.");
  process.exit(1);
}

function needsSsl(connStr) {
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

const sql = postgres(url, {
  max: 1,
  prepare: false,
  ssl: needsSsl(url) ? "require" : false,
});

try {
  const db = drizzle(sql);
  console.log("[migrate] applying migrations...");
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("[migrate] done.");
} finally {
  await sql.end({ timeout: 5 });
}
