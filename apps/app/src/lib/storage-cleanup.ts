import "server-only";
import { withAuthorizedProjects } from "@vibe/auth";
import { storageObjects } from "@vibe/db/schema";
import { eq, sql } from "drizzle-orm";
import { deleteObject } from "@/lib/storage";

/** Explicit invocation only. Deletes one batch inside caller's authorized personal/tenant scope. */
export async function cleanupExpiredStorageUploads(currentHeaders: Headers, tenantIdentifier: string | null): Promise<number> {
  if (process.env.STORAGE_ENABLED !== "true") throw new Error("STORAGE_DISABLED");
  return withAuthorizedProjects(currentHeaders, tenantIdentifier, "delete", async tx => {
    const expired = await tx.select().from(storageObjects)
      .where(sql`${storageObjects.status} = 'pending' and ${storageObjects.expiresAt} <= now()`)
      .orderBy(storageObjects.expiresAt).limit(100).for("update", { skipLocked: true });
    for (const record of expired) {
      const context = record.organizationId ? { namespace: "org" as const, id: record.organizationId } : { namespace: "user" as const, id: record.ownerUserId };
      // deleteObject validates exact approved namespace + UUID key before contacting S3.
      await deleteObject(context, { key: record.key });
      await tx.delete(storageObjects).where(eq(storageObjects.id, record.id));
    }
    return expired.length;
  });
}
