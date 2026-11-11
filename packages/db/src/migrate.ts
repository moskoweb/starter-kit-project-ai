import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateMigrationEnv } from "@vibe/config/env";
import { pendingScopeProtections } from "./scope-protections.mjs";

const { MIGRATION_DATABASE_URL } = validateMigrationEnv();

const client = postgres(MIGRATION_DATABASE_URL, {
  max: 1,
  connect_timeout: 5,
});

const db = drizzle(client);

async function runMigrations(): Promise<void> {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const migrationsFolder = path.resolve(currentDir, "../migrations");

  try {
    const { pending } = await pendingScopeProtections(path.resolve(currentDir, ".."));
    if (pending.length) throw new Error("Pending scope protections; run pnpm db:generate before db:migrate");
    console.log("Applying database migrations...");
    await migrate(db, { migrationsFolder });
    console.log("Database migrations applied successfully.");
  } finally {
    await client.end({ timeout: 5 });
  }
}

runMigrations().catch((err: unknown) => {
  if (err instanceof Error && /scope protection/i.test(err.message)) console.error(err.message);
  const code = (err && typeof err === "object" && "code" in err && typeof err.code === "string")
    ? err.code
    : "UNKNOWN";
  console.error(`Migration failed with database error code: ${code}`);
  process.exit(1);
});
