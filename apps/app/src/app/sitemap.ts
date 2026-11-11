import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const value = process.env.NEXT_PUBLIC_SITE_URL;
  if (!value) return [];
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? [{ url: url.origin }] : [];
  } catch {
    return [];
  }
}
