import type { Metadata } from "next";
import { getAuth } from "@vibe/auth";
import { Alert, AlertDescription, AlertTitle } from "@vibe/ui/components/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@vibe/ui/components/card";
import { PageHeader } from "@vibe/ui/components/resource/page-header";
import { ChangePasswordForm } from "@/components/account/change-password-form";
import { SessionsList, type SessionRow } from "@/components/account/sessions-list";
import { SecurityForm } from "@/components/auth/security-form";
import { pageSession } from "@/lib/identity-session";
import { currentLocale } from "@/lib/panels/chrome";
import { messages } from "@/lib/i18n";

export const dynamic = "force-dynamic";
export async function generateMetadata(): Promise<Metadata> { return { title: messages[await currentLocale()].security }; }

const text = {
  "pt-BR": {
    description: "Senha, autenticação em duas etapas e sessões ativas.",
    password: "Senha", passwordDescription: "Use uma senha longa e exclusiva.",
    twoFactor: "Autenticação em duas etapas", twoFactorDescription: "Exija um código do aplicativo autenticador ao entrar.",
    sessions: "Sessões ativas", sessionsDescription: "Dispositivos conectados à sua conta.",
    stale: "Entre novamente para ver as sessões", staleDescription: "Por segurança, a lista de sessões exige um login recente.",
  },
  en: {
    description: "Password, two-factor authentication and active sessions.",
    password: "Password", passwordDescription: "Use a long, unique password.",
    twoFactor: "Two-factor authentication", twoFactorDescription: "Require an authenticator app code at sign-in.",
    sessions: "Active sessions", sessionsDescription: "Devices signed in to your account.",
    stale: "Sign in again to view sessions", staleDescription: "For security, the session list requires a recent sign-in.",
  },
};

export default async function SecurityPage() {
  const { session, headers } = await pageSession();
  const locale = await currentLocale();
  const copy = text[locale];
  // Better Auth listSessions requires a fresh session (freshAge); older sessions see a re-login hint.
  const sessions: SessionRow[] | null = await getAuth().api.listSessions({ headers }).then(rows => rows.map(row => ({
    token: row.token, userAgent: row.userAgent ?? null, ipAddress: row.ipAddress ?? null, createdAt: new Date(row.createdAt).toISOString(), current: row.token === session.session.token,
  })).sort((a, b) => Number(b.current) - Number(a.current) || b.createdAt.localeCompare(a.createdAt))).catch(() => null);
  return <>
    <PageHeader title={messages[locale].security} description={copy.description} />
    <Card>
      <CardHeader><CardTitle>{copy.password}</CardTitle><CardDescription>{copy.passwordDescription}</CardDescription></CardHeader>
      <CardContent><ChangePasswordForm locale={locale} /></CardContent>
    </Card>
    <Card>
      <CardHeader><CardTitle>{copy.twoFactor}</CardTitle><CardDescription>{copy.twoFactorDescription}</CardDescription></CardHeader>
      <CardContent><SecurityForm enabled={Boolean(session.user.twoFactorEnabled)} locale={locale} /></CardContent>
    </Card>
    <Card>
      <CardHeader><CardTitle>{copy.sessions}</CardTitle><CardDescription>{copy.sessionsDescription}</CardDescription></CardHeader>
      <CardContent>{sessions ? <SessionsList sessions={sessions} locale={locale} /> : <Alert><AlertTitle>{copy.stale}</AlertTitle><AlertDescription>{copy.staleDescription}</AlertDescription></Alert>}</CardContent>
    </Card>
  </>;
}
