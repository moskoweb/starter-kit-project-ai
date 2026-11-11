import { headers } from "next/headers";
import { requireSession, resolveTenant, withAuthorizedProjects } from "@vibe/auth";
import { getIdentityEnv } from "@vibe/config/env";
import { listDeliveries, retryDelivery } from "@vibe/webhooks/delivery";
import { readJsonLimited } from "@/lib/security/rate-limit";
import { z } from "zod";

const scope = z.string().trim().min(1).max(200).nullable();
const retrySchema = z.object({ id: z.string().uuid(), tenantIdentifier: scope }).strict();
function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (message === "UNAUTHORIZED") return Response.json({ error: message }, { status: 401 });
  if (["FORBIDDEN", "NOT_FOUND", "ORGANIZATION_REQUIRED"].includes(message)) return Response.json({ error: "FORBIDDEN" }, { status: 403 });
  return Response.json({ error: "DELIVERY_REQUEST_FAILED" }, { status: 500 });
}
function validTenant(identifier: string | null) {
  if (identifier === null) return getIdentityEnv().IDENTITY_PROFILE !== "organizations";
  return getIdentityEnv().IDENTITY_PROFILE !== "personal" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(identifier);
}
export async function GET(request: Request) {
  if (process.env.WEBHOOKS_OUTBOUND_ENABLED !== "true") return Response.json({ error: "DISABLED" }, { status: 404 });
  const url = new URL(request.url);
  if ([...url.searchParams.keys()].some(key => key !== "tenantIdentifier") || url.searchParams.getAll("tenantIdentifier").length > 1) return Response.json({ error: "INVALID_REQUEST" }, { status: 400 });
  const identifier = scope.safeParse(url.searchParams.get("tenantIdentifier"));
  if (!identifier.success || !validTenant(identifier.data)) return Response.json({ error: "INVALID_REQUEST" }, { status: 400 });
  try {
    const currentHeaders = await headers();
    await requireSession(currentHeaders);
    if (identifier.data !== null) await resolveTenant(identifier.data, currentHeaders);
    const rows = await withAuthorizedProjects(currentHeaders, identifier.data, "read", tx => listDeliveries(tx));
    return Response.json({ items: rows.map(({ id, event, status, attempts, nextAt, createdAt, lastStatusCode }) => ({ id, event, status, attempts, nextAt, createdAt, lastStatusCode })) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return errorResponse(error); }
}
export async function POST(request: Request) {
  if (process.env.WEBHOOKS_OUTBOUND_ENABLED !== "true") return Response.json({ error: "DISABLED" }, { status: 404 });
  let trustedOrigin: string;
  try { trustedOrigin = new URL(getIdentityEnv().BETTER_AUTH_URL).origin; } catch { return Response.json({ error: "CONFIGURATION_INVALID" }, { status: 500 }); }
  if (request.headers.get("origin") !== trustedOrigin) return Response.json({ error: "CSRF_REJECTED" }, { status: 403 });
  let raw: unknown;
  try { raw = await readJsonLimited(request, 4096); } catch (error) { return Response.json({ error: "INVALID_REQUEST" }, { status: error instanceof RangeError ? 413 : 400 }); }
  const parsed = retrySchema.safeParse(raw);
  if (!parsed.success || !validTenant(parsed.data.tenantIdentifier)) return Response.json({ error: "INVALID_REQUEST" }, { status: 400 });
  try {
    const currentHeaders = await headers();
    await requireSession(currentHeaders);
    if (parsed.data.tenantIdentifier !== null) {
      const tenant = await resolveTenant(parsed.data.tenantIdentifier, currentHeaders);
      if (!tenant.role.split(",").some(role => role.trim() === "owner" || role.trim() === "admin")) throw new Error("FORBIDDEN");
    }
    const rows = await withAuthorizedProjects(currentHeaders, parsed.data.tenantIdentifier, "create", tx => retryDelivery(tx, parsed.data.id));
    return Response.json({ updated: rows.length }, { status: rows.length ? 200 : 404 });
  } catch (error) { return errorResponse(error); }
}

