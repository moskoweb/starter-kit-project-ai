import { readAiConfig, streamAiText, type AiConfig } from "@vibe/ai";
import { requireSession, resolveTenant, withAuthorizedProjects } from "@vibe/auth";
import { projects } from "@vibe/db/schema";
import { getIdentityEnv } from "@vibe/config/env";
import { reserveAiUsage } from "@/lib/ai/usage";
import { headers } from "next/headers";
import { z } from "zod";
import { enforceRateLimit, RateLimitExceeded } from "@/lib/security/rate-limit";
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

  const maxBodyBytes = 128 * 1024;
  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > maxBodyBytes) return Response.json({ error: "REQUEST_TOO_LARGE" }, { status: 413 });
  let body: unknown;
  try {
    if (!request.body) throw new Error("EMPTY_BODY");
    const reader = request.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBodyBytes) { await reader.cancel(); return Response.json({ error: "REQUEST_TOO_LARGE" }, { status: 413 }); }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    body = JSON.parse(new TextDecoder().decode(bytes));
  } catch { return Response.json({ error: "INVALID_REQUEST" }, { status: 400 }); }
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
    await withAuthorizedProjects(currentHeaders, tenantIdentifier, "read", async (tx) => {
      await enforceRateLimit(tx, { key: `ai:${session.user.id}:${tenantId ?? "personal"}`, limit: 10, windowSeconds: 60 });
      await reserveAiUsage(tx, tenantId, maxRequests, maxTokens * 2, maxDailyTokens);
    });
    const tools = {
      listAuthorizedProjects: {
        description: "List projects authorized for current user and tenant.",
        inputSchema: z.object({}).strict(),
        execute: async (_input: Record<string, never>) => withAuthorizedProjects(currentHeaders, tenantIdentifier, "read", async (tx) =>
          tx.select({ id: projects.id, name: projects.name, description: projects.description }).from(projects).orderBy(projects.name).limit(50)),
      },
    };
    const result = streamAiText(config, {
      prompt: parsed.data.prompt,
      maxOutputTokens: maxTokens,
      abortSignal: request.signal,
      tools,
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
