export const STORAGE_URL_TTL_SECONDS = 60;
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const ALLOWED_CONTENT_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf", "text/plain"] as const;

/** Server-owned context, after caller checks session, ownership/membership and operation policy. Not an authorization proof. */
export type AuthorizedStorageContext = Readonly<{
  namespace: "org" | "user";
  id: string;
}>;

export type UploadInput = Readonly<{ contentType: string; size: number }>;
export type StoredObject = Readonly<{ key: string }>;

export function storagePrefix(context: AuthorizedStorageContext): string {
  if (!context || (context.namespace !== "org" && context.namespace !== "user") ||
    typeof context.id !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(context.id)) {
    throw new Error("Storage requires a valid server-authorized org/user context");
  }
  return `${context.namespace}/${context.id}/`;
}

export function validateUpload(input: UploadInput): void {
  if (!input || !(ALLOWED_CONTENT_TYPES as readonly string[]).includes(input.contentType)) {
    throw new Error("Storage content type is not allowed");
  }
  if (!Number.isSafeInteger(input.size) || input.size < 1 || input.size > MAX_UPLOAD_BYTES) {
    throw new Error(`Storage size must be 1..${MAX_UPLOAD_BYTES} bytes`);
  }
}

export function validateObjectKey(context: AuthorizedStorageContext, object: StoredObject): string {
  const prefix = storagePrefix(context);
  if (!object || typeof object.key !== "string" || !object.key.startsWith(prefix) ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(object.key.slice(prefix.length))) {
    throw new Error("Storage object key is invalid or outside authorized namespace");
  }
  return object.key;
}
