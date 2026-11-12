import type { Metadata } from "next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@vibe/ui/components/card";
import { PageHeader } from "@vibe/ui/components/resource/page-header";
import { SecurityForm } from "@/components/auth/security-form";
import { currentLocale } from "@/lib/panels/chrome";
import { messages } from "@/lib/i18n";

export const dynamic = "force-dynamic";
export async function generateMetadata(): Promise<Metadata> { return { title: messages[await currentLocale()].security }; }

export default async function SecurityPage() {
  const locale = await currentLocale();
  const en = locale === "en";
  return <>
    <PageHeader title={messages[locale].security} description={en ? "Protect your account with two-factor authentication." : "Proteja sua conta com autenticação em duas etapas."} />
    <Card>
      <CardHeader><CardTitle>{en ? "Two-factor authentication" : "Autenticação em duas etapas"}</CardTitle><CardDescription>{en ? "Use an authenticator app. Confirm your password to change settings." : "Use um aplicativo autenticador. Confirme sua senha para alterar."}</CardDescription></CardHeader>
      <CardContent><SecurityForm locale={locale} /></CardContent>
    </Card>
  </>;
}
