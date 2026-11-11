export const dynamic = "force-dynamic";
export function GET() {
  if (process.env.PWA_ENABLED !== "true") return new Response(null, { status: 404 });
  return Response.json({ id: "/", name: process.env.PWA_NAME || "Vibe Starter", short_name: process.env.PWA_SHORT_NAME || "Vibe", start_url: "/account", scope: "/", display: "standalone", background_color: "#ffffff", theme_color: "#0f172a", icons: [{ src: "/icons/pwa-192.png", sizes: "192x192", type: "image/png" }, { src: "/icons/pwa-512.png", sizes: "512x512", type: "image/png" }] }, { headers: { "Content-Type": "application/manifest+json", "Cache-Control": "no-store" } });
}
