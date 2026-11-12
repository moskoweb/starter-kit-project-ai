import type { Metadata } from "next";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@vibe/ui/components/card";
import { PageHeader } from "@vibe/ui/components/resource/page-header";
import { ChangeEmailForm } from "@/components/account/change-email-form";
import { DeleteAccount } from "@/components/account/delete-account";
import { ProfileForm } from "@/components/account/profile-form";
import { SignOut } from "@/components/identity/sign-out";
import { PushSettings } from "@/components/push-settings";
import { pageSession } from "@/lib/identity-session";
import { currentLocale } from "@/lib/panels/chrome";
import { messages } from "@/lib/i18n";

const text = {
  "pt-BR": {
    description: "Gerencie seu perfil, email e conta.",
    profile: "Perfil", profileDescription: "Nome exibido no aplicativo e nos emails.",
    email: "Email", emailDescription: "Endereço usado para entrar e receber notificações.",
    session: "Sessão", sessionDescription: "Encerre a sessão neste dispositivo.",
    danger: "Zona de perigo", dangerDescription: "Excluir a conta é permanente e exige confirmação por email.",
  },
  en: {
    description: "Manage your profile, email and account.",
    profile: "Profile", profileDescription: "Name shown in the app and in emails.",
    email: "Email", emailDescription: "Address used to sign in and receive notifications.",
    session: "Session", sessionDescription: "Sign out on this device.",
    danger: "Danger zone", dangerDescription: "Deleting your account is permanent and requires email confirmation.",
  },
};

export async function generateMetadata(): Promise<Metadata> { return { title: messages[await currentLocale()].account }; }

export default async function AccountPage() {
  const { session } = await pageSession();
  const locale = await currentLocale();
  const copy = text[locale];
  return <>
    <PageHeader title={messages[locale].account} description={copy.description} />
    <Card>
      <CardHeader><CardTitle>{copy.profile}</CardTitle><CardDescription>{copy.profileDescription}</CardDescription></CardHeader>
      <CardContent><ProfileForm name={session.user.name} locale={locale} /></CardContent>
    </Card>
    <Card>
      <CardHeader><CardTitle>{copy.email}</CardTitle><CardDescription>{copy.emailDescription}</CardDescription></CardHeader>
      <CardContent><ChangeEmailForm email={session.user.email} locale={locale} /></CardContent>
    </Card>
    <PushSettings enabled={process.env.PUSH_ENABLED === "true"} locale={locale} />
    <Card>
      <CardHeader><CardTitle>{copy.session}</CardTitle><CardDescription>{copy.sessionDescription}</CardDescription></CardHeader>
      <CardFooter><SignOut locale={locale} /></CardFooter>
    </Card>
    <Card className="ring-destructive/30">
      <CardHeader><CardTitle className="text-destructive">{copy.danger}</CardTitle><CardDescription>{copy.dangerDescription}</CardDescription></CardHeader>
      <CardFooter className="border-t"><DeleteAccount locale={locale} /></CardFooter>
    </Card>
  </>;
}
