import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";

const productionBuild = process.argv.includes("build");
const rawSiteUrl = process.env.SITE_URL || (productionBuild ? "" : "http://127.0.0.1:4321");
if (!rawSiteUrl) throw new Error("SITE_URL is required for public production builds.");
let siteUrl;
try {
  const parsed = new URL(rawSiteUrl);
  const localHttp = !productionBuild && parsed.protocol === "http:" && ["127.0.0.1", "localhost", "[::1]"].includes(parsed.hostname);
  if ((parsed.protocol !== "https:" && !localHttp) || parsed.username || parsed.password || parsed.search || parsed.hash || parsed.pathname !== "/") throw new Error();
  siteUrl = parsed.href.replace(/\/$/, "");
} catch {
  throw new Error("SITE_URL must be an HTTPS origin without credentials, path, query, or fragment");
}

export default defineConfig({
  output: "static",
  site: siteUrl,
  integrations: [sitemap({ filter: (page) => !/(?:^|\/)404\/?$/.test(new URL(page).pathname) })],
  vite: { plugins: [tailwindcss()] },
});
