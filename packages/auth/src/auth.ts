import "server-only";
import { randomUUID } from "node:crypto";
import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { admin, organization, twoFactor } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import { getDb } from "@vibe/db";
import * as schema from "@vibe/db/schema";
import { getIdentityEnv } from "@vibe/config/env";
import { sendEmail, renderAuthEmail, type AuthEmail } from "@vibe/email";
import { accessControl, roles } from "./permissions";
import { totpReplayGuard } from "./totp-replay";
import { singleTenantBoundary } from "./single-tenant";

async function sendAuthEmail(to: string, template: AuthEmail) {
  return sendEmail({ to, ...await renderAuthEmail(template) });
}
function createAuth() {
  const env = getIdentityEnv();
  return betterAuth({
    appName: "Vibe Starter",
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    database: drizzleAdapter(getDb(), { provider: "pg", schema }),
    advanced: { database: { generateId: () => randomUUID() } },
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: ({ user, url }) => sendAuthEmail(user.email, { type: "reset-password", url }),
    },
    emailVerification: {
      sendOnSignUp: true,
      sendOnSignIn: true,
      autoSignInAfterVerification: false,
      sendVerificationEmail: ({ user, url }) => sendAuthEmail(user.email, { type: "verification", url }),
    },
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        if (ctx.path === "/sign-up/email" && ctx.body && ["role", "banned", "emailVerified", "twoFactorEnabled"].some((key) => key in ctx.body)) {
          throw new APIError("BAD_REQUEST", { message: "Campos privilegiados não são aceitos no cadastro." });
        }
        if (env.IDENTITY_PROFILE === "personal" && ctx.path.startsWith("/organization/")) {
          throw new APIError("FORBIDDEN", { message: "Organizações desabilitadas neste perfil." });
        }
        if ((ctx.path === "/organization/create" || ctx.path === "/organization/update") && ctx.body) {
          const slug = ctx.body.slug ?? ctx.body.data?.slug;
          if (slug !== undefined && (typeof slug !== "string" || slug.length > 80 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug) || ["new", "settings", "members", "invitations", "admin", "personal"].includes(slug))) {
            throw new APIError("BAD_REQUEST", { message: "Slug inválido ou reservado." });
          }
        }
      }),
    },
    plugins: [
      admin({ defaultRole: "user", adminRoles: ["admin"] }),
      organization({
        ac: accessControl,
        roles,
        allowUserToCreateOrganization: env.ORGANIZATION_MODE === "single" ? false : (user) => env.IDENTITY_PROFILE !== "personal" && user.emailVerified,
        ...(env.ORGANIZATION_MODE === "single" ? {
          organizationHooks: {
            // Native server-only create/addMember APIs must obey the same boundary.
            beforeCreateOrganization: async () => {
              throw new APIError("FORBIDDEN", { message: "Criação de organizações desabilitada neste aplicativo." });
            },
            beforeAddMember: async ({ member }) => {
              if (member.organizationId !== env.SINGLE_ORGANIZATION_ID) {
                throw new APIError("FORBIDDEN", { message: "Organização indisponível neste aplicativo." });
              }
            },
          },
        } : {}),
        requireEmailVerificationOnInvitation: true,
        sendInvitationEmail: ({ email, id, organization }) => sendAuthEmail(email, { type: "invitation", organizationName: organization.name, url: `${env.BETTER_AUTH_URL}/invitations/${encodeURIComponent(id)}` }),
      }),
      twoFactor({
        issuer: "Vibe Starter",
        otpOptions: {
          storeOTP: "hashed",
          sendOTP: ({ user, otp }) => sendAuthEmail(user.email, { type: "otp", code: otp }),
        },
      }),
      totpReplayGuard(),
      ...(env.ORGANIZATION_MODE === "single" ? [singleTenantBoundary(env.SINGLE_ORGANIZATION_ID!)] : []),
      nextCookies(),
    ],
  });
}
function lazy<T>(create: () => T) {
  let value: T | undefined;
  return () => value ??= create();
}
export const getAuth = lazy(createAuth);
