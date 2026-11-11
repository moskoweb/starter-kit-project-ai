import { z } from "zod";

const postgresUrlSchema = z.string().refine(
  (val) => {
    try {
      const url = new URL(val);
      return url.protocol === "postgres:" || url.protocol === "postgresql:";
    } catch {
      return false;
    }
  },
  {
    message: "Must be a valid PostgreSQL connection URL with postgres: or postgresql: protocol",
  }
);

const portSchema = z
  .string()
  .default("3000")
  .refine((val) => /^\d+$/.test(val), {
    message: "PORT must contain only digits",
  })
  .transform((val) => parseInt(val, 10))
  .refine((val) => val >= 1 && val <= 65535, {
    message: "PORT must be an integer between 1 and 65535",
  });

export const runtimeEnvSchema = z.object({
  DATABASE_URL: postgresUrlSchema,
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: portSchema,
});

export const migrationEnvSchema = z.object({
  MIGRATION_DATABASE_URL: postgresUrlSchema,
});

export type RuntimeEnv = z.infer<typeof runtimeEnvSchema>;
export type MigrationEnv = z.infer<typeof migrationEnvSchema>;

export function validateRuntimeEnv(env: Record<string, string | undefined> = process.env): RuntimeEnv {
  const result = runtimeEnvSchema.safeParse(env);
  if (!result.success) {
    const formatted = JSON.stringify(result.error.flatten().fieldErrors);
    throw new Error(`Runtime environment validation failed: ${formatted}`);
  }
  return result.data;
}

export function validateMigrationEnv(env: Record<string, string | undefined> = process.env): MigrationEnv {
  const result = migrationEnvSchema.safeParse(env);
  if (!result.success) {
    const formatted = JSON.stringify(result.error.flatten().fieldErrors);
    throw new Error(`Migration environment validation failed: ${formatted}`);
  }
  return result.data;
}

export { getIdentityEnv } from "./identity";
