import { NextResponse } from "next/server";
import { getSql } from "@vibe/db";
import { exportLog, logEvent, type LogEvent } from "@vibe/observability";

export const dynamic = "force-dynamic";

const TIMEOUT_MS = 3000;

export async function GET() {
  const start = Date.now();
  const requestId = crypto.randomUUID();
  let status = 503;
  let timerId: NodeJS.Timeout | undefined;

  try {
    const sql = getSql();
    const query = sql`SELECT 1`.simple();
    const { promise: timeoutPromise, reject } = Promise.withResolvers<never>();

    timerId = setTimeout(() => {
      // Cancelamento assíncrono seguro com catch para evitar rejeições não tratadas
      query.cancel().catch(() => {});
      reject(new Error("HEALTH_TIMEOUT"));
    }, TIMEOUT_MS);

    await Promise.race([query, timeoutPromise]);

    const latencyMs = Date.now() - start;
    status = 200;

    return NextResponse.json(
      {
        status: "ok",
        db: "connected",
        latencyMs,
      },
      { status: 200, headers: { "X-Request-Id": requestId } }
    );
  } catch {
    // 503 sanitizado fixo: NUNCA expor mensagens de erro internas, driver ou connection string
    return NextResponse.json(
      {
        status: "error",
        db: "unreachable",
      },
      { status: 503, headers: { "X-Request-Id": requestId } }
    );
  } finally {
    clearTimeout(timerId);
    const entry: LogEvent = { level: status === 200 ? "info" : "error", event: "health_request", requestId, status, duration: Date.now() - start };
    logEvent(entry);
    void exportLog(entry).catch(() => {});
  }
}
