import type { Metadata } from "next";
import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { AnalyticsConsent } from "../components/analytics";
import { PwaControls } from "../components/pwa";
import "./globals.css";

export function generateMetadata(): Metadata {
  return { title: "Vibe Starter Kit", description: "Next.js 16 + Drizzle + Turborepo", ...(process.env.PWA_ENABLED === "true" ? { manifest: "/manifest.webmanifest" } : {}) };
}

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  const preferences = await cookies();
  const locale = preferences.get("locale")?.value === "en" ? "en" : "pt-BR";
  const theme = preferences.get("theme")?.value === "dark" ? "dark" : "light";
  return (
    <html lang={locale} data-theme={theme}>
      <body>{children}<AnalyticsConsent /><PwaControls enabled={process.env.PWA_ENABLED === "true"} pushEnabled={process.env.PUSH_ENABLED === "true"} /></body>
    </html>
  );
}
