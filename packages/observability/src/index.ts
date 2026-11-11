export type LogLevel = "debug" | "info" | "warn" | "error";

export type LogEvent = {
  level: LogLevel;
  event: string;
  requestId?: string;
  userId?: string;
  tenantId?: string;
  duration?: number;
  status?: number;
};

const allowed: Record<string, true> = { level: true, event: true, requestId: true, userId: true, tenantId: true, duration: true, status: true };

function sanitize(input: LogEvent): LogEvent {
  const record: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(input)) {
    if (!Object.hasOwn(allowed, key)) continue;
    if (key === "level" && (value === "debug" || value === "info" || value === "warn" || value === "error")) record[key] = value;
    else if (key === "event" && typeof value === "string" && /^[a-zA-Z][a-zA-Z0-9_.:-]{0,127}$/.test(value)) record[key] = value;
    else if (["requestId", "userId", "tenantId"].includes(key) && typeof value === "string" && /^[a-zA-Z0-9_-]{1,128}$/.test(value)) record[key] = value;
    else if (key === "duration" && typeof value === "number" && Number.isFinite(value) && value >= 0) record[key] = value;
    else if (key === "status" && typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 599) record[key] = value;
  }
  return record as LogEvent;
}

/** Writes only approved structured fields; never serialize arbitrary errors or request data. */
export function logEvent(input: LogEvent): void {
  const event = sanitize(input);
  const line = JSON.stringify(event);
  if (event.level === "error") console.error(line);
  else if (event.level === "warn") console.warn(line);
  else console.log(line);
}

/** Optional OTLP/HTTP JSON endpoint; disabled unless explicitly configured. */
export async function exportLog(input: LogEvent): Promise<void> {
  const event = sanitize(input);
  const endpoint = process.env.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT;
  if (process.env.OTEL_LOG_EXPORT_ENABLED !== "true") return;
  if (!endpoint) {
    console.error(JSON.stringify({ level: "error", event: "otel_export_config_invalid", status: 0 }));
    return;
  }
  let url: URL;
  try {
    url = new URL(endpoint);
    if (url.protocol !== "https:" || !url.hostname || url.username || url.password) throw new Error();
  } catch {
    console.error(JSON.stringify({ level: "error", event: "otel_export_config_invalid", status: 0 }));
    return;
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2000);
  try {
    const response = await fetch(url, {
      method: "POST",
      redirect: "error",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ resourceLogs: [{ scopeLogs: [{ logRecords: [{ body: { stringValue: JSON.stringify(event) } }] }] }] }),
      signal: controller.signal,
    });
    if (!response.ok) console.error(JSON.stringify({ level: "error", event: "otel_export_failed", status: response.status }));
  } catch {
    console.error(JSON.stringify({ level: "error", event: "otel_export_failed", status: 0 }));
  } finally {
    clearTimeout(timer);
  }
}

