import type { Metadata } from "next";
import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { AnalyticsConsent } from "../components/analytics";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vibe Starter Kit",
  description: "Next.js 16 + Drizzle + Turborepo",
};

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
      <body>{children}<AnalyticsConsent /></body>
    </html>
  );
}
