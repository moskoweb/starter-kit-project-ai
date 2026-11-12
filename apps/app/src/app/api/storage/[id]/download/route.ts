import { headers } from "next/headers";
import { withTenantScope } from "@vibe/auth";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { createDownloadUrl } from "@/lib/storage";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (process.env.STORAGE_ENABLED !== "true") return Response.json({ error: "STORAGE_DISABLED" }, { status: 404 });
  const { id } = await params; if (!z.string().uuid().safeParse(id).success) return Response.json({ error: "INVALID_REQUEST" }, { status: 400 });
  const url = new URL(request.url); const tenantIdentifier = url.searchParams.get("tenantIdentifier");
  if ([...url.searchParams.keys()].some(k => k !== "tenantIdentifier") || tenantIdentifier === "") return Response.json({ error: "INVALID_REQUEST" }, { status: 400 });
  const currentHeaders = await headers(); try {
    const result = await withTenantScope(currentHeaders, tenantIdentifier, "read", async tx => {
      // RLS limits rows to caller's personal/tenant scope.
      const [record] = await tx.execute<{ owner_user_id: string; organization_id: string | null; object_key: string }>(sql`select owner_user_id, organization_id, object_key from storage_objects where id=${id}::uuid and status='ready'`);
      if (!record) throw new Error("NOT_FOUND");
      const context = record.organization_id ? { namespace: "org" as const, id: record.organization_id } : { namespace: "user" as const, id: record.owner_user_id };
      return createDownloadUrl(context, { key: record.object_key });
    });
    return Response.json(result, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { const message = error instanceof Error ? error.message : ""; const status = message === "UNAUTHORIZED" ? 401 : ["FORBIDDEN", "NOT_FOUND", "ORGANIZATION_REQUIRED"].includes(message) ? 403 : 500; return Response.json({ error: status === 500 ? "STORAGE_ERROR" : message }, { status, headers: { "Cache-Control": "private, no-store" } }); }
}
