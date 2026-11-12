import type { Metadata } from "next";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@vibe/ui/components/card";
import { PageHeader } from "@vibe/ui/components/resource/page-header";
import { SignOut } from "@/components/identity/sign-out";
import { PushSettings } from "@/components/push-settings";
import { pageSession } from "@/lib/identity-session";
import { currentLocale } from "@/lib/panels/chrome";
import { messages } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> { return { title: messages[await currentLocale()].account }; }

export default async function AccountPage() {
  const { session } = await pageSession();
  const locale = await currentLocale();
  const en = locale === "en";
  return <>
    <PageHeader title={messages[locale].account} description={en ? "Your profile and session." : "Seu perfil e sessão."} />
    <Card>
      <CardHeader><CardTitle>{en ? "Profile" : "Perfil"}</CardTitle><CardDescription>{en ? "Information from your sign-in account." : "Informações da sua conta de acesso."}</CardDescription></CardHeader>
      <CardContent>
        <dl className="grid gap-x-6 gap-y-5 md:grid-cols-2">
          <div className="flex flex-col gap-1"><dt className="text-sm font-medium text-muted-foreground">{en ? "Name" : "Nome"}</dt><dd className="text-sm">{session.user.name}</dd></div>
          <div className="flex flex-col gap-1"><dt className="text-sm font-medium text-muted-foreground">Email</dt><dd className="text-sm">{session.user.email}</dd></div>
        </dl>
      </CardContent>
      <CardFooter className="border-t"><SignOut locale={locale} /></CardFooter>
    </Card>
    <PushSettings enabled={process.env.PUSH_ENABLED === "true"} locale={locale} />
  </>;
}
