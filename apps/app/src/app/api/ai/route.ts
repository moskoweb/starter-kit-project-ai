import { readAiConfig, streamAiText, type AiConfig } from "@vibe/ai";
import { requireSession, resolveTenant, withTenantScope } from "@vibe/auth";
import { getIdentityEnv } from "@vibe/config/env";
import { reserveAiUsage } from "@/lib/ai/usage";
import { headers } from "next/headers";
import { z } from "zod";
import { enforceRateLimit, RateLimitExceeded, readJsonLimited } from "@/lib/security/rate-limit";
import { exportLog, logEvent, type LogEvent } from "@vibe/observability";

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  const started = performance.now();
  const report = (event: string, status: number) => {
    const entry: LogEvent = { level: status >= 500 ? "error" : status >= 400 ? "warn" : "info", event, requestId, status, duration: Math.round(performance.now() - started) };
    logEvent(entry);
    void exportLog(entry).catch(() => {});
  };
  try {
    const response = await handlePost(request, report);
    response.headers.set("X-Request-Id", requestId);
    report("ai_request", response.status);
    return response;
  } catch (error) {
    report("ai_request", 500);
    throw error;
  }
}

const bodySchema = z.object({
  prompt: z.string().trim().min(1).max(32_000),
  tenantIdentifier: z.string().min(1).nullable().optional(),
}).strict();

async function handlePost(request: Request, report: (event: string, status: number) => void) {
  let config: AiConfig;
  try { config = readAiConfig({ AI_ENABLED: process.env.AI_ENABLED, AI_API_KEY: process.env.AI_API_KEY, AI_BASE_URL: process.env.AI_BASE_URL, AI_MODEL: process.env.AI_MODEL }); } catch {
    return Response.json({ error: "AI_CONFIGURATION_INVALID" }, { status: 500 });
  }
  if (!config.enabled) return Response.json({ error: "AI_DISABLED" }, { status: 404 });

  if (request.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase() !== "application/json") {
    return Response.json({ error: "INVALID_REQUEST" }, { status: 415 });
  }
  const origin = request.headers.get("origin");
  let trustedOrigin: string;
  try { trustedOrigin = new URL(getIdentityEnv().BETTER_AUTH_URL).origin; } catch {
    return Response.json({ error: "AI_CONFIGURATION_INVALID" }, { status: 500 });
  }
  if (!origin || origin !== trustedOrigin) return Response.json({ error: "FORBIDDEN" }, { status: 403 });

  let body: unknown;
  try { body = await readJsonLimited(request, 128 * 1024); }
  catch (error) { return Response.json({ error: error instanceof RangeError ? "REQUEST_TOO_LARGE" : "INVALID_REQUEST" }, { status: error instanceof RangeError ? 413 : 400 }); }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "INVALID_REQUEST" }, { status: 400 });

  const currentHeaders = await headers();
  try {
    const session = await requireSession(currentHeaders);
    const tenantIdentifier = parsed.data.tenantIdentifier ?? null;
    const tenantId = tenantIdentifier === null ? null : (await resolveTenant(tenantIdentifier, currentHeaders)).id;
    const maxTokens = Number(process.env.AI_MAX_OUTPUT_TOKENS ?? "1024");
    const maxRequests = Number(process.env.AI_DAILY_MAX_REQUESTS ?? "30");
    const maxDailyTokens = Number(process.env.AI_DAILY_MAX_OUTPUT_TOKENS ?? "20000");
    if (!Number.isSafeInteger(maxTokens) || maxTokens < 1 || maxTokens > 4096 || !Number.isSafeInteger(maxRequests) || maxRequests < 1 || !Number.isSafeInteger(maxDailyTokens) || maxDailyTokens < maxTokens * 2) {
      throw new Error("AI_LIMIT_CONFIGURATION_INVALID");
    }
    await withTenantScope(currentHeaders, tenantIdentifier, "read", async (tx) => {
      await enforceRateLimit(tx, { key: `ai:${session.user.id}:${tenantId ?? "personal"}`, limit: 10, windowSeconds: 60 });
      await reserveAiUsage(tx, tenantId, maxRequests, maxTokens * 2, maxDailyTokens);
    });
    // No tools ship by default; add app-specific tools that re-authorize via withTenantScope (see docs/AI.md).
    const result = streamAiText(config, {
      prompt: parsed.data.prompt,
      maxOutputTokens: maxTokens,
      abortSignal: request.signal,
      onError: () => report("ai_stream_error", 500),
      onEnd: () => report("ai_stream_end", 200),
      onAbort: () => report("ai_stream_abort", 499),
    });
    return result.toTextStreamResponse({ headers: { "Cache-Control": "no-cache", "X-Content-Type-Options": "nosniff" } });
  } catch (error) {
    if (error instanceof RateLimitExceeded) return Response.json({ error: "RATE_LIMIT_EXCEEDED" }, { status: 429, headers: { "Retry-After": String(error.retryAfter) } });
    const message = error instanceof Error ? error.message : "";
    if (message === "UNAUTHORIZED") return Response.json({ error: message }, { status: 401 });
    if (["FORBIDDEN", "NOT_FOUND", "ORGANIZATION_REQUIRED"].includes(message)) return Response.json({ error: "FORBIDDEN" }, { status: 403 });
    if (message === "AI_QUOTA_EXCEEDED") return Response.json({ error: message }, { status: 429 });
    return Response.json({ error: "AI_REQUEST_FAILED" }, { status: 500 });
  }
}
