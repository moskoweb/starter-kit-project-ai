import type { BetterAuthPlugin } from "better-auth";
import { APIError, createAuthMiddleware, getAuthoritativeSessionFromCtx } from "better-auth/api";

const scopedEndpoints: Record<string, true> = {
  "/organization/update": true, "/organization/delete": true, "/organization/get-organization": true,
  "/organization/get-full-organization": true, "/organization/set-active": true, "/organization/invite-member": true,
  "/organization/list-invitations": true, "/organization/remove-member": true, "/organization/update-member-role": true,
  "/organization/get-active-member": true, "/organization/get-active-member-role": true, "/organization/list-members": true,
  "/organization/leave": true, "/organization/has-permission": true,
};
const invitationEndpoints: Record<string, true> = {
  "/organization/accept-invitation": true, "/organization/reject-invitation": true,
  "/organization/cancel-invitation": true, "/organization/get-invitation": true,
};
const listEndpoints: Record<string, true> = { "/organization/list": true, "/organization/list-user-invitations": true };

/** Boundary only: native endpoints retain session, membership, recipient and role checks. */
export const singleTenantBoundary = (organizationId: string): BetterAuthPlugin => ({
  id: "single-tenant-boundary",
  hooks: {
    before: [{
      matcher: (ctx) => ctx.path?.startsWith("/organization/") === true,
      handler: createAuthMiddleware(async (ctx) => {
        const deny = () => { throw new APIError("FORBIDDEN", { message: "Organização indisponível neste aplicativo." }); };
        if (Object.hasOwn(listEndpoints, ctx.path)) return; // Filter native authorized results below.
        if (Object.hasOwn(invitationEndpoints, ctx.path)) {
          const id = ctx.path === "/organization/get-invitation" ? ctx.query?.id : ctx.body?.invitationId;
          if (typeof id !== "string" || !id) return deny();
          const invitation = await ctx.context.adapter.findOne<{ organizationId: string }>({
            model: "invitation", where: [{ field: "id", value: id }],
          });
          if (invitation?.organizationId !== organizationId) deny();
          return;
        }
        // Fail closed for create/check-slug and future endpoints, including teams/roles if enabled later.
        if (!Object.hasOwn(scopedEndpoints, ctx.path)) return deny();
        const input = ctx.path === "/organization/get-active-member" ? undefined : ctx.method === "GET" ? ctx.query : ctx.body;
        // Explicit null clears active organization, preserving personal/hybrid context.
        if (ctx.path === "/organization/set-active" && input?.organizationId === null) return;
        if (input?.organizationId !== undefined && input.organizationId !== null && input.organizationId !== organizationId) deny();
        const supportsSlug = ctx.path === "/organization/set-active" || ctx.path === "/organization/get-organization"
          || ctx.path === "/organization/get-full-organization" || ctx.path === "/organization/list-members"
          || ctx.path === "/organization/get-active-member-role";
        if (input?.organizationSlug !== undefined) {
          if (!supportsSlug) return deny();
          if (typeof input.organizationSlug !== "string" || !input.organizationSlug) return deny();
          const organization = await ctx.context.adapter.findOne<{ id: string }>({
            model: "organization", where: [{ field: "slug", value: input.organizationSlug }],
          });
          if (organization?.id !== organizationId) deny();
        }
        if (!input?.organizationId && !input?.organizationSlug) {
          const session = await getAuthoritativeSessionFromCtx(ctx);
          if ((session?.session as { activeOrganizationId?: string | null } | undefined)?.activeOrganizationId !== organizationId) deny();
        }
        // IDs are globally addressable; do not trust a matching organizationId beside a foreign member ID.
        const memberId = ctx.path === "/organization/update-member-role" ? ctx.body?.memberId
          : ctx.path === "/organization/remove-member" ? ctx.body?.memberIdOrEmail : undefined;
        if (memberId !== undefined) {
          if (typeof memberId !== "string" || !memberId) return deny();
          // Native email lookup is already scoped to the checked organization.
          if (ctx.path === "/organization/update-member-role" || !memberId.includes("@")) {
            const member = await ctx.context.adapter.findOne<{ organizationId: string }>({
              model: "member", where: [{ field: "id", value: memberId }],
            });
            if (member?.organizationId !== organizationId) deny();
          }
        }
      }),
    }],
    after: [{
      matcher: (ctx) => typeof ctx.path === "string" && Object.hasOwn(listEndpoints, ctx.path),
      handler: createAuthMiddleware(async (ctx) => {
        const result: unknown = ctx.context.returned;
        // Leave native errors unchanged; never replace an auth failure with a successful empty list.
        if (!Array.isArray(result)) return;
        const field = ctx.path === "/organization/list" ? "id" : "organizationId";
        return ctx.json(result.filter((row) => row !== null && typeof row === "object" && row[field] === organizationId));
      }),
    }],
  },
});
