import "server-only";
import { randomUUID } from "node:crypto";
import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware, getSessionFromCtx } from "better-auth/api";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { admin, organization, twoFactor } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import { and, eq, inArray, ne } from "drizzle-orm";
import { getDb } from "@vibe/db";
import * as schema from "@vibe/db/schema";
import { getGoogleEnv, getIdentityEnv } from "@vibe/config/env";
import { sendEmail, renderAuthEmail, type AuthEmail } from "@vibe/email";
import { accessControl, roles } from "./permissions";
import { totpReplayGuard } from "./totp-replay";
import { singleTenantBoundary } from "./single-tenant";

async function sendAuthEmail(to: string, template: AuthEmail) {
  return sendEmail({ to, ...await renderAuthEmail(template) });
}
/** Account deletion must not orphan an organization: refuse while user is its only owner. */
async function assertNotSoleOwner(userId: string) {
  const db = getDb();
  const owned = await db.select({ organizationId: schema.member.organizationId }).from(schema.member)
    .where(and(eq(schema.member.userId, userId), eq(schema.member.role, "owner")));
  if (!owned.length) return;
  const ids = owned.map((row) => row.organizationId);
  const shared = await db.selectDistinct({ organizationId: schema.member.organizationId }).from(schema.member)
    .where(and(inArray(schema.member.organizationId, ids), eq(schema.member.role, "owner"), ne(schema.member.userId, userId)));
  if (shared.length < ids.length) {
    throw new APIError("BAD_REQUEST", { message: "Você é o único proprietário de uma organização. Transfira a propriedade ou exclua a organização antes de excluir a conta." });
  }
}
function createAuth() {
  const env = getIdentityEnv();
  const google = getGoogleEnv();
  return betterAuth({
    appName: "Vibe Starter",
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    database: drizzleAdapter(getDb(), { provider: "pg", schema }),
    advanced: { database: { generateId: () => randomUUID() } },
    user: {
      // Verified users confirm on current address first; Better Auth then verifies new address via sendVerificationEmail.
      changeEmail: {
        enabled: true,
        sendChangeEmailConfirmation: ({ user, newEmail, url }) => sendAuthEmail(user.email, { type: "change-email", newEmail, url }),
      },
      deleteUser: {
        enabled: true,
        sendDeleteAccountVerification: ({ user, url }) => sendAuthEmail(user.email, { type: "delete-account", url }),
        beforeDelete: (user) => assertNotSoleOwner(user.id),
      },
    },
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: ({ user, url }) => sendAuthEmail(user.email, { type: "reset-password", url }),
    },
    // Optional Google sign-in; account linking keeps Better Auth defaults (no trusted providers).
    ...(google.enabled ? { socialProviders: { google: { clientId: google.clientId, clientSecret: google.clientSecret } } } : {}),
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
        // Fail fast before emailing a deletion link; beforeDelete re-checks when link is used.
        if (ctx.path === "/delete-user") {
          const session = await getSessionFromCtx(ctx);
          if (session) await assertNotSoleOwner(session.user.id);
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
      // Impersonation sessions expire after 1h; admins cannot impersonate other admins. Banned sign-in fails with code BANNED_USER (UI routes to /banned).
      admin({ defaultRole: "user", adminRoles: ["admin"], impersonationSessionDuration: 60 * 60, allowImpersonatingAdmins: false, defaultBanReason: "Banned by administrator", bannedUserMessage: "Conta suspensa por um administrador." }),
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
