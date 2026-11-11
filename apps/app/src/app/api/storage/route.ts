import { randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { requireSession, withAuthorizedProjects } from "@vibe/auth";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { getIdentityEnv } from "@vibe/config/env";
import { readJsonLimited } from "@/lib/security/rate-limit";
import { createUploadUrl, MAX_UPLOAD_BYTES, ALLOWED_CONTENT_TYPES } from "@/lib/storage";
import { projects, storageObjects } from "@vibe/db/schema";

const inputSchema = z.object({ tenantIdentifier: z.string().min(1).nullable(), projectId: z.string().uuid(), contentType: z.enum(ALLOWED_CONTENT_TYPES), size: z.number().int().min(1).max(MAX_UPLOAD_BYTES) }).strict();
export async function POST(request: Request) {
  if (process.env.STORAGE_ENABLED !== "true") return Response.json({ error: "STORAGE_DISABLED" }, { status: 404 });
  let trustedOrigin: string;
  try { trustedOrigin = new URL(getIdentityEnv().BETTER_AUTH_URL).origin; } catch { return Response.json({ error: "STORAGE_CONFIGURATION_INVALID" }, { status: 500 }); }
  if (request.headers.get("origin") !== trustedOrigin) return Response.json({ error: "FORBIDDEN" }, { status: 403 });
  let body: unknown; try { body = await readJsonLimited(request, 2048); } catch (error) { return Response.json({ error: "INVALID_REQUEST" }, { status: error instanceof RangeError ? 413 : 400 }); }
  const parsed = inputSchema.safeParse(body); if (!parsed.success) return Response.json({ error: "INVALID_REQUEST" }, { status: 400 });
  const currentHeaders = await headers(); try {
    const session = await requireSession(currentHeaders);
    const metadata = await withAuthorizedProjects(currentHeaders, parsed.data.tenantIdentifier, "create", async tx => {
      const project = (await tx.select({ id: projects.id, organizationId: projects.organizationId }).from(projects).where(eq(projects.id, parsed.data.projectId)).limit(1))[0];
      if (!project) throw new Error("NOT_FOUND");
      const context = project.organizationId ? { namespace: "org" as const, id: project.organizationId } : { namespace: "user" as const, id: session.user.id };
      const upload = await createUploadUrl(context, { contentType: parsed.data.contentType, size: parsed.data.size }); const id = randomUUID();
      await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${session.user.id}, 0))`);
      const [{ pending, bytes }] = await tx.select({ pending: sql<number>`count(*)::int`, bytes: sql<number>`coalesce(sum(${storageObjects.size}), 0)::bigint` }).from(storageObjects).where(sql`${storageObjects.ownerUserId} = ${session.user.id}::uuid and ${storageObjects.status} = 'pending' and ${storageObjects.expiresAt} > now()`);
      if (pending >= 5 || Number(bytes) + parsed.data.size > 52_428_800) throw new Error("STORAGE_QUOTA");
      await tx.insert(storageObjects).values({ id, ownerUserId: session.user.id, organizationId: project.organizationId, projectId: project.id, key: upload.object.key, contentType: parsed.data.contentType, size: parsed.data.size, status: "pending", expiresAt: new Date(Date.now() + 5 * 60_000) });
      return { id, ...upload };
    });
    return Response.json(metadata, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { const message = error instanceof Error ? error.message : ""; if (message === "STORAGE_QUOTA") return Response.json({ error: message }, { status: 429 }); const status = message === "UNAUTHORIZED" ? 401 : ["FORBIDDEN", "NOT_FOUND", "ORGANIZATION_REQUIRED"].includes(message) ? 403 : 500; return Response.json({ error: status === 500 ? "STORAGE_ERROR" : message }, { status }); }
}
export async function GET(request: Request) {
  if (process.env.STORAGE_ENABLED !== "true") return Response.json({ error: "STORAGE_DISABLED" }, { status: 404 });
  const url = new URL(request.url); const tenantIdentifier = url.searchParams.get("tenantIdentifier"); const projectId = url.searchParams.get("projectId");
  if ([...url.searchParams.keys()].some(k => !["tenantIdentifier", "projectId"].includes(k)) || tenantIdentifier === "" || !projectId || !z.string().uuid().safeParse(projectId).success) return Response.json({ error: "INVALID_REQUEST" }, { status: 400 });
  const currentHeaders = await headers(); try {
    const items = await withAuthorizedProjects(currentHeaders, tenantIdentifier, "read", async tx => {
      const [project] = await tx.select({ id: projects.id }).from(projects).where(eq(projects.id, projectId)).limit(1); if (!project) throw new Error("NOT_FOUND");
      return tx.select({ id: storageObjects.id, projectId: storageObjects.projectId, contentType: storageObjects.contentType, size: storageObjects.size, status: storageObjects.status, createdAt: storageObjects.createdAt }).from(storageObjects).where(sql`${storageObjects.projectId} = ${projectId}::uuid and (${storageObjects.status} = 'ready' or (${storageObjects.status} = 'pending' and ${storageObjects.expiresAt} > now()))`).orderBy(sql`${storageObjects.createdAt} desc`).limit(100);
    }); return Response.json({ items }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { const message = error instanceof Error ? error.message : ""; const status = message === "UNAUTHORIZED" ? 401 : ["FORBIDDEN", "NOT_FOUND", "ORGANIZATION_REQUIRED"].includes(message) ? 403 : 500; return Response.json({ error: status === 500 ? "STORAGE_ERROR" : message }, { status }); }
}
