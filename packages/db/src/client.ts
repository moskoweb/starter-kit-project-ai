import postgres from "postgres";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { validateRuntimeEnv } from "@vibe/config/env";
import * as schema from "./schema";

export type Database = PostgresJsDatabase<typeof schema>;

interface DbGlobals {
  __vibeSql?: postgres.Sql;
  __vibeDb?: Database;
}

const globals = globalThis as typeof globalThis & DbGlobals;

// Cliente pequeno e lazy: nada conecta no import nem no build. Valida env na primeira chamada.
export function getSql(): postgres.Sql {
  if (!globals.__vibeSql) {
    const { DATABASE_URL } = validateRuntimeEnv();
    globals.__vibeSql = postgres(DATABASE_URL, {
      max: 5,
      connect_timeout: 3,
      queue_timeout: 5,
      query_timeout: 10,
      idle_timeout: 20,
      connection: { statement_timeout: 10000 },
    });
  }
  return globals.__vibeSql;
}

export function getDb(): Database {
  if (!globals.__vibeDb) {
    globals.__vibeDb = drizzle(getSql(), { schema });
  }
  return globals.__vibeDb;
}

export async function closeDb(): Promise<void> {
  const client = globals.__vibeSql;
  globals.__vibeSql = undefined;
  globals.__vibeDb = undefined;
  await client?.end({ timeout: 5 });
}
