import { acceptInbound } from "@vibe/webhooks/delivery";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ endpointId: string }> }) {
  const { endpointId } = await params;
  if (!process.env.WEBHOOK_INBOUND_ENDPOINT_ID || endpointId !== process.env.WEBHOOK_INBOUND_ENDPOINT_ID) return new Response("NOT_FOUND", { status: 404 });
  if (Number(request.headers.get("content-length") ?? 0) > 256 * 1024) return new Response("PAYLOAD_TOO_LARGE", { status: 413 });
  const reader = request.body?.getReader();
  if (!reader) return new Response("INVALID_PAYLOAD", { status: 400 });
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 256 * 1024) { await reader.cancel(); return new Response("PAYLOAD_TOO_LARGE", { status: 413 }); }
      chunks.push(value);
    }
  } catch { return new Response("INVALID_PAYLOAD", { status: 400 }); }
  const raw = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { raw.set(chunk, offset); offset += chunk.byteLength; }
  const result = await acceptInbound(raw, request.headers);
  return new Response(result.body, { status: result.status });
}
