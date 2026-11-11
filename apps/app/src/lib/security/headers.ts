function configuredOrigin(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.origin : null;
  } catch {
    return null;
  }
}

const connectSources = new Set(["'self'"]);
for (const value of [process.env.S3_PUBLIC_UPLOAD_ORIGIN, process.env.NEXT_PUBLIC_ANALYTICS_ENABLED === "true" ? process.env.NEXT_PUBLIC_POSTHOG_HOST : undefined]) {
  const origin = configuredOrigin(value);
  if (origin) connectSources.add(origin);
}
if (process.env.NODE_ENV === "development") connectSources.add("ws://localhost:*");
const scriptSources = ["'self'", "'unsafe-inline'", ...(process.env.NODE_ENV === "development" ? ["'unsafe-eval'"] : [])];

/** Baseline headers only; strict Next.js CSP needs per-request nonce propagation, not implemented here. */
export const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Content-Security-Policy", value: `default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; img-src 'self' data:; font-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src ${scriptSources.join(" ")}; connect-src ${[...connectSources].join(" ")}` },
];
