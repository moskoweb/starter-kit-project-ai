import Link from "next/link";
import { cookies } from "next/headers";
import { getIdentityEnv } from "@vibe/config/env";
import { Button } from "@vibe/ui/components/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@vibe/ui/components/card";
import { pageSession } from "../../lib/identity-session";
import { buildPanelPath } from "../../lib/panels/routing";
import { SignOut } from "../../components/identity/sign-out";
import { PushSettings } from "../../components/push-settings";
export default async function Page() { const { session } = await pageSession(); const profile = getIdentityEnv().IDENTITY_PROFILE; const locale = (await cookies()).get("locale")?.value === "en" ? "en" : "pt-BR"; const en = locale === "en";
return <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
  <Card>
    <CardHeader>
      <CardTitle><h1>{en ? "My account" : "Minha conta"}</h1></CardTitle>
      <CardDescription>{session.user.name}</CardDescription>
    </CardHeader>
    <CardContent className="flex flex-col gap-6">
      <nav className="flex flex-wrap gap-2" aria-label={en ? "Account" : "Conta"}>
        {profile !== "organizations" && <Button asChild variant="link"><Link href={buildPanelPath("personal")}>{en ? "Personal panel" : "Painel pessoal"}</Link></Button>}
        {profile !== "personal" && <Button asChild variant="link"><Link href="/organizations">{en ? "Organizations" : "Organizações"}</Link></Button>}
        <Button asChild variant="link"><Link href="/security">{en ? "Security" : "Segurança"}</Link></Button>
      </nav>
      <PushSettings enabled={process.env.PUSH_ENABLED === "true"} locale={locale} />
    </CardContent>
    <CardFooter><SignOut locale={locale} /></CardFooter>
  </Card>
</main>; }
