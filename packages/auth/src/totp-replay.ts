import type { BetterAuthPlugin } from "better-auth";
import { APIError, createAuthMiddleware, getAuthoritativeSessionFromCtx } from "better-auth/api";
import { constantTimeEqual, symmetricDecrypt } from "better-auth/crypto";
import { base32 } from "@better-auth/utils/base32";
import { createOTP } from "@better-auth/utils/otp";
import { getDb, totpReplay } from "@vibe/db";
import { sql } from "drizzle-orm";

/** Install after twoFactor(); pass matching period/digits if overriding native defaults.
 * Native endpoint still owns challenge, budgets and session issuance.
 * Valid steps consumed before native failure stay consumed (fail closed).
 */
export const totpReplayGuard = (options: { period?: number; digits?: number } = {}): BetterAuthPlugin => ({
  id: "totp-replay-guard",
  hooks: {
    before: [{
      matcher: (ctx) => ctx.path === "/two-factor/verify-totp",
      handler: createAuthMiddleware(async (ctx) => {
        const code = ctx.body?.code;
        if (typeof code !== "string") return; // Native schema rejects malformed input.
        const session = await getAuthoritativeSessionFromCtx(ctx);
        let userId = session?.user.id;
        if (!userId) {
          const cookie = ctx.context.createAuthCookie("two_factor");
          const challenge = await ctx.getSignedCookie(cookie.name, ctx.context.secret);
          if (!challenge) return;
          const record = await ctx.context.internalAdapter.findVerificationValue(challenge);
          if (!record || new Date(record.expiresAt).getTime() <= Date.now()) return;
          userId = record.value;
        }
        if (!userId) return;
        const factor = await ctx.context.adapter.findOne<{ secret: string; verified?: boolean }>({
          model: "twoFactor", where: [{ field: "userId", value: userId }],
        });
        if (!factor || (!session && factor.verified === false)) return;
        const period = options.period ?? 30;
        const digits = options.digits ?? 6;
        const decrypted = await symmetricDecrypt({ key: ctx.context.secretConfig, data: factor.secret });
        const secret = decrypted.startsWith("base32:") ? base32.decode(decrypted.slice(7).toUpperCase()) : decrypted;
        const otp = createOTP(secret, { period, digits });
        if (!await otp.verify(code)) return; // Native failure path maintains lockout/attempt budgets.
        const counter = Math.floor(Date.now() / (period * 1000));
        let matchedStep = -1;
        // Native drift is ±1 timestep; monotonic lastStep rejects earlier steps too.
        for (const step of [counter - 1, counter, counter + 1]) {
          if (constantTimeEqual(await otp.hotp(step), code)) matchedStep = step;
        }
        if (matchedStep < 0) throw new APIError("UNAUTHORIZED", { code: "INVALID_CODE", message: "Invalid code" });
        const accepted = await getDb().insert(totpReplay).values({ userId, lastStep: matchedStep })
          .onConflictDoUpdate({
            target: totpReplay.userId,
            set: { lastStep: matchedStep },
            setWhere: sql`${totpReplay.lastStep} < ${matchedStep}`,
          }).returning({ userId: totpReplay.userId });
        if (!accepted.length) throw new APIError("UNAUTHORIZED", { code: "INVALID_CODE", message: "Invalid code" });
        // Fail closed: later native failure does not release consumed timestep.
      }),
    }],
  },
});
