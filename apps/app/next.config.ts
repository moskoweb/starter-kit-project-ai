import type { NextConfig } from "next";
import { securityHeaders } from "./src/lib/security/headers";

const nextConfig: NextConfig = {
  experimental: { authInterrupts: true },
  output: "standalone",
  transpilePackages: ["@vibe/auth", "@vibe/email", "@vibe/db", "@vibe/ui", "@vibe/config", "@vibe/events", "@vibe/ai", "@vibe/storage", "@vibe/webhooks", "@vibe/observability"],
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
