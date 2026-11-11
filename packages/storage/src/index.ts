import "server-only";
import { randomUUID } from "node:crypto";
import { DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getStorageConfig } from "./config";
import {
  STORAGE_URL_TTL_SECONDS, storagePrefix, validateObjectKey, validateUpload,
  type AuthorizedStorageContext, type StoredObject, type UploadInput,
} from "./validation";

export { ALLOWED_CONTENT_TYPES, MAX_UPLOAD_BYTES, STORAGE_URL_TTL_SECONDS } from "./validation";
export type { AuthorizedStorageContext, StoredObject, UploadInput } from "./validation";

export interface UploadUrlResult {
  url: string;
  fields: Record<string, string>;
  method: "POST";
  expiresAt: string;
  object: {
    key: string;
    bucket: string;
    namespace: AuthorizedStorageContext["namespace"];
    namespaceId: string;
    contentType: string;
    size: number;
  };
}

export interface DownloadUrlResult {
  url: string;
  expiresAt: string;
}

async function withStorage<T>(operation: (client: S3Client, bucket: string) => Promise<T>): Promise<T> {
  const { bucket, ...config } = getStorageConfig();
  const client = new S3Client({
    ...config,
    forcePathStyle: true,
    maxAttempts: 1,
    requestHandler: { connectionTimeout: 3_000, requestTimeout: 10_000 },
  });
  try { return await operation(client, bucket); } finally { client.destroy(); }
}

/** Caller must authorize creation before supplying context. Returned metadata describes a pending upload, not a verified file. */
export async function createUploadUrl(context: AuthorizedStorageContext, input: UploadInput): Promise<UploadUrlResult> {
  validateUpload(input);
  const key = `${storagePrefix(context)}${randomUUID()}`;
  return withStorage(async (client, bucket) => {
    const { url, fields } = await createPresignedPost(client, {
      Bucket: bucket,
      Key: key,
      Expires: STORAGE_URL_TTL_SECONDS,
      Fields: { "Content-Type": input.contentType },
      Conditions: [
        ["eq", "$Content-Type", input.contentType],
        ["content-length-range", input.size, input.size],
      ],
    });
    return {
      url, fields, method: "POST" as const,
      expiresAt: new Date(Date.now() + STORAGE_URL_TTL_SECONDS * 1000).toISOString(),
      object: {
        key, bucket, namespace: context.namespace, namespaceId: context.id,
        contentType: input.contentType, size: input.size,
      },
    };
  });
}

/** Load object from scoped DB record and authorize download before calling; prefix validation alone is not policy. */
export async function createDownloadUrl(context: AuthorizedStorageContext, object: StoredObject): Promise<DownloadUrlResult> {
  const key = validateObjectKey(context, object);
  return withStorage(async (client, bucket) => ({
    url: await getSignedUrl(client, new GetObjectCommand({
      Bucket: bucket, Key: key,
      ResponseContentDisposition: "attachment",
      ResponseCacheControl: "private, no-store",
    }), { expiresIn: STORAGE_URL_TTL_SECONDS }),
    expiresAt: new Date(Date.now() + STORAGE_URL_TTL_SECONDS * 1000).toISOString(),
  }));
}

/** Caller authorizes upload completion and compares actual size/type against pending DB metadata. */
export async function headObject(context: AuthorizedStorageContext, object: StoredObject) {
  const key = validateObjectKey(context, object);
  return withStorage(async (client, bucket) => {
    const result = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }), {
      abortSignal: AbortSignal.timeout(10_000),
    });
    return { key, size: result.ContentLength, contentType: result.ContentType, etag: result.ETag };
  });
}

/** Caller must authorize deletion and resolve object through scoped DB record first. */
export async function deleteObject(context: AuthorizedStorageContext, object: StoredObject): Promise<void> {
  const key = validateObjectKey(context, object);
  await withStorage(async (client, bucket) => {
    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }), {
      abortSignal: AbortSignal.timeout(10_000),
    });
  });
}
