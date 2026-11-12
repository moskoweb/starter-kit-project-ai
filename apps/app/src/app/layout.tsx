import type { Metadata } from "next";
import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { AnalyticsConsent } from "../components/analytics";
import { Providers } from "../components/providers";
import { PwaControls } from "../components/pwa";
import "./globals.css";

export function generateMetadata(): Metadata {
  return { title: { default: "Vibe Starter Kit", template: "%s · Vibe Starter Kit" }, description: "Next.js 16 + Drizzle + Turborepo", ...(process.env.PWA_ENABLED === "true" ? { manifest: "/manifest.webmanifest" } : {}) };
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = (await cookies()).get("locale")?.value === "en" ? "en" : "pt-BR";
  return (
    <html lang={locale} suppressHydrationWarning>
      <body className="min-h-svh antialiased">
        <Providers>{children}<AnalyticsConsent /><PwaControls enabled={process.env.PWA_ENABLED === "true"} pushEnabled={process.env.PUSH_ENABLED === "true"} /></Providers>
      </body>
    </html>
  );
}
