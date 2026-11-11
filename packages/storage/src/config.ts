export function getStorageConfig(env: NodeJS.ProcessEnv = process.env) {
  if (env.STORAGE_ENABLED !== "true") {
    if (env.STORAGE_ENABLED && env.STORAGE_ENABLED !== "false") {
      throw new Error("STORAGE_ENABLED must be true or false");
    }
    throw new Error("Storage is disabled; set STORAGE_ENABLED=true to use storage operations");
  }
  const required = (name: string): string => {
    const value = env[name];
    if (!value?.trim()) throw new Error(`Enabled storage requires ${name}`);
    return value;
  };
  const endpoint = required("S3_ENDPOINT");
  let url: URL;
  try { url = new URL(endpoint); } catch { throw new Error("S3_ENDPOINT must be a valid HTTP(S) URL"); }
  if (url.username || url.password || url.search || url.hash ||
    (url.protocol !== "https:" && !(url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)))) {
    throw new Error("S3_ENDPOINT requires HTTPS (HTTP allowed only on loopback), without credentials, query or fragment");
  }
  const region = required("S3_REGION");
  const bucket = required("S3_BUCKET");
  if (!/^[a-zA-Z0-9-]+$/.test(region)) throw new Error("S3_REGION is invalid");
  if (!/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(bucket)) throw new Error("S3_BUCKET is invalid");
  return {
    endpoint, region, bucket,
    credentials: {
      accessKeyId: required("S3_ACCESS_KEY_ID"),
      secretAccessKey: required("S3_SECRET_ACCESS_KEY"),
    },
  };
}
