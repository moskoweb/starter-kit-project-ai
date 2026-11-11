import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", disallow: ["/app/", "/admin/", "/organizations/", "/account/", "/login", "/signup", "/api/auth/"] }],
    sitemap: publicOrigin() ? `${publicOrigin()}/sitemap.xml` : undefined,
  };
}

function publicOrigin(): string | null {
  const value = process.env.NEXT_PUBLIC_SITE_URL;
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.origin : null;
  } catch {
    return null;
  }
}
