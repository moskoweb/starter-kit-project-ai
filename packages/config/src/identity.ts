import { z } from "zod";

const identityEnvSchema = z.object({
  BETTER_AUTH_SECRET: z.string().min(32).refine((value) => !/replace|change.?me|example|placeholder/i.test(value), "Generate a random secret"),
  BETTER_AUTH_URL: z.url(),
  IDENTITY_PROFILE: z.enum(["personal", "organizations", "hybrid"]).default("hybrid"),
  ORGANIZATION_MODE: z.enum(["single", "multi"]).default("multi"),
  SINGLE_ORGANIZATION_ID: z.preprocess((value) => value === "" ? undefined : value, z.uuid().optional()),
}).superRefine((env, ctx) => {
  if (env.ORGANIZATION_MODE === "single" && !env.SINGLE_ORGANIZATION_ID) {
    ctx.addIssue({ code: "custom", path: ["SINGLE_ORGANIZATION_ID"], message: "Required in single organization mode" });
  }
});

export function getIdentityEnv(env: Record<string, string | undefined> = process.env) {
  const result = identityEnvSchema.safeParse(env);
  if (!result.success) {
    throw new Error(`Identity configuration invalid: ${Object.keys(result.error.flatten().fieldErrors).join(", ")}`);
  }
  return result.data;
}
