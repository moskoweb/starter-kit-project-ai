import { headers } from "next/headers";
import { requireSession, withTenantScope } from "@vibe/auth";
import { getIdentityEnv } from "@vibe/config/env";
import { storageObjects } from "@vibe/db/schema";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { headObject } from "@/lib/storage";
import { readJsonLimited } from "@/lib/security/rate-limit";

const inputSchema = z.object({ tenantIdentifier: z.string().min(1).nullable() }).strict();
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (process.env.STORAGE_ENABLED !== "true") return Response.json({ error: "STORAGE_DISABLED" }, { status: 404 });
  let trustedOrigin: string;
  try { trustedOrigin = new URL(getIdentityEnv().BETTER_AUTH_URL).origin; } catch { return Response.json({ error: "STORAGE_CONFIGURATION_INVALID" }, { status: 500 }); }
  if (request.headers.get("origin") !== trustedOrigin) return Response.json({ error: "FORBIDDEN" }, { status: 403 });
  let body: unknown;
  try { body = await readJsonLimited(request, 2048); } catch (error) { return Response.json({ error: "INVALID_REQUEST" }, { status: error instanceof RangeError ? 413 : 400 }); }
  const parsed = inputSchema.safeParse(body);
  const { id } = await params;
  if (!parsed.success || !z.string().uuid().safeParse(id).success) return Response.json({ error: "INVALID_REQUEST" }, { status: 400 });
  const currentHeaders = await headers();
  try {
    const session = await requireSession(currentHeaders);
    const result = await withTenantScope(currentHeaders, parsed.data.tenantIdentifier, "update", async tx => {
      const [record] = await tx.select().from(storageObjects).where(eq(storageObjects.id, id)).for("update");
      if (!record || record.ownerUserId !== session.user.id || record.status !== "pending" || record.expiresAt <= new Date()) throw new Error("NOT_FOUND");
      const context = record.organizationId ? { namespace: "org" as const, id: record.organizationId } : { namespace: "user" as const, id: record.ownerUserId };
      const actual = await headObject(context, { key: record.key });
      if (actual.size !== record.size || actual.contentType !== record.contentType) throw new Error("UPLOAD_MISMATCH");
      const [updated] = await tx.update(storageObjects).set({ status: "ready" }).where(sql`${storageObjects.id} = ${id}::uuid and ${storageObjects.status} = 'pending' and ${storageObjects.expiresAt} > clock_timestamp()`).returning({ id: storageObjects.id, status: storageObjects.status });
      if (!updated) throw new Error("NOT_FOUND");
      return updated;
    });
    return Response.json(result, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { const message = error instanceof Error ? error.message : ""; const status = message === "UNAUTHORIZED" ? 401 : message === "UPLOAD_MISMATCH" ? 400 : ["FORBIDDEN", "NOT_FOUND", "ORGANIZATION_REQUIRED"].includes(message) ? 403 : 500; return Response.json({ error: status === 500 ? "STORAGE_ERROR" : message }, { status }); }
}
