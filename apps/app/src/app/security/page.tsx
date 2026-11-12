import { cookies } from "next/headers";
import { Card, CardContent, CardHeader, CardTitle } from "@vibe/ui/components/card";
import { pageSession } from "../../lib/identity-session";
import { SecurityForm } from "../../components/auth/security-form";

export const dynamic = "force-dynamic";

export default async function SecurityPage() {
  await pageSession();
  const locale = (await cookies()).get("locale")?.value === "en" ? "en" : "pt-BR";
  const en = locale === "en";
  return <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
    <Card>
      <CardHeader>
        <CardTitle><h1>{en ? "Security" : "Segurança"}</h1></CardTitle>
      </CardHeader>
      <CardContent><SecurityForm locale={locale} /></CardContent>
    </Card>
  </main>;
}
