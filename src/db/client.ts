import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const url = process.env.DATABASE_URL;

export const db = url
  ? drizzle(postgres(url, { max: 5, prepare: false }), { schema })
  : null;

export const hasDb = Boolean(db);
