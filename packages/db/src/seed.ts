import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { validateRuntimeEnv } from "@vibe/config/env";
import { appSettings } from "./schema";

const { DATABASE_URL } = validateRuntimeEnv();

const client = postgres(DATABASE_URL, {
  max: 1,
  connect_timeout: 5,
});

const db = drizzle(client);

async function runSeed(): Promise<void> {
  try {
    console.log("Seeding app_settings without overwriting existing customizations...");

    await db
      .insert(appSettings)
      .values({
        key: "app_name",
        value: "Vibe Starter Kit",
      })
      .onConflictDoNothing({ target: appSettings.key });

    console.log("Seed completed successfully.");
  } finally {
    await client.end({ timeout: 5 });
  }
}

runSeed().catch((err: unknown) => {
  const code = (err && typeof err === "object" && "code" in err && typeof err.code === "string")
    ? err.code
    : "UNKNOWN";
  console.error(`Seed failed with database error code: ${code}`);
  process.exit(1);
});
