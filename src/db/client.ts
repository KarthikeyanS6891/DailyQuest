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

declare global {
  // eslint-disable-next-line no-var
  var __dq_pg: ReturnType<typeof postgres> | undefined;
  // eslint-disable-next-line no-var
  var __dq_db: ReturnType<typeof drizzle<typeof schema>> | undefined;
}

const client = globalThis.__dq_pg ?? postgres(url, { max: 5, prepare: false });
if (!globalThis.__dq_pg) globalThis.__dq_pg = client;

export const db = globalThis.__dq_db ?? drizzle(client, { schema });
if (!globalThis.__dq_db) globalThis.__dq_db = db;
