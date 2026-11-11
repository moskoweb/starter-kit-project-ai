import { POST as markNotification } from "../../route";
import { readJsonLimited } from "@/lib/security/rate-limit";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) return Response.json({ error: "INVALID_REQUEST" }, { status: 400 });
  let body: unknown;
  try { body = await readJsonLimited(request, 4096); }
  catch (error) {
    if (error instanceof RangeError) return Response.json({ error: "INVALID_REQUEST" }, { status: 413 });
    return Response.json({ error: "INVALID_REQUEST" }, { status: 400 });
  }
  if (!body || typeof body !== "object" || !("id" in body) || body.id !== id) return Response.json({ error: "INVALID_REQUEST" }, { status: 400 });
  return markNotification(new Request(request.url, { method: request.method, headers: request.headers, body: JSON.stringify(body) }));
}
