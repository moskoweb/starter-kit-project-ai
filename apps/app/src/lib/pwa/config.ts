import "server-only";

export function isPwaEnabled(): boolean {
  return process.env.PWA_ENABLED === "true";
}

export function isWorkerEnabled(): boolean {
  return isPwaEnabled() || process.env.PUSH_ENABLED === "true";
}
