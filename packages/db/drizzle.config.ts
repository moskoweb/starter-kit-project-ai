import { defineConfig } from "drizzle-kit";

// Env injetada explicitamente pelo ambiente (sem carregamento de .env). Sem fallback para DATABASE_URL.
const migrationUrl = process.env.MIGRATION_DATABASE_URL;


export default defineConfig({
  schema: "./src/schema.ts",
  out: "./migrations",
  dialect: "postgresql",
  ...(migrationUrl ? { dbCredentials: { url: migrationUrl } } : {}),
});
