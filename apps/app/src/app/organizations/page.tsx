import Link from "next/link";
import { getAuth } from "@vibe/auth";
import { getIdentityEnv } from "@vibe/config/env";
import { notFound } from "next/navigation";
import { Button } from "@vibe/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@vibe/ui/components/card";
import { Field, FieldDescription, FieldLabel } from "@vibe/ui/components/field";
import { Input } from "@vibe/ui/components/input";
import { pageSession } from "../../lib/identity-session";
import { OrganizationForm } from "../../components/identity/organization-form";
export default async function Page() {
  const { headers } = await pageSession();
  const env = getIdentityEnv();
  if (env.IDENTITY_PROFILE === "personal") notFound();
  const single = env.ORGANIZATION_MODE === "single";
  const organizations = (await getAuth().api.listOrganizations({ headers })).filter((org) => !single || org.id === env.SINGLE_ORGANIZATION_ID);
  return <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
    <div><Button asChild variant="link" className="px-0"><Link href="/account">Minha conta</Link></Button></div>
    <Card>
      <CardHeader><CardTitle><h1>Organizações</h1></CardTitle></CardHeader>
      <CardContent>
        {organizations.length ? <ul className="divide-y">{organizations.map((org) => <li className="flex flex-wrap items-center justify-between gap-4 py-4" key={org.id}><Link className="underline" href={"/organizations/" + encodeURIComponent(org.slug)}>{org.name}</Link><OrganizationForm action="select" organizationId={org.id} label="Selecionar contexto" /></li>)}</ul> : <p className="text-muted-foreground">{single ? "Você ainda não participa da organização deste aplicativo. Aceite um convite recebido por email ou solicite acesso ao operador." : "Você ainda não participa de uma organização. Crie uma ou aceite um convite recebido por email."}</p>}
      </CardContent>
    </Card>
    {single ? <p className="text-sm text-muted-foreground">Este aplicativo usa uma única organização. O operador deve provisioná-la e convidar os participantes; a criação de organizações está desabilitada.</p> : <Card>
      <CardHeader><CardTitle><h2>Criar organização</h2></CardTitle><CardDescription>Informe o nome e o identificador usado na URL.</CardDescription></CardHeader>
      <CardContent>
        <OrganizationForm action="create" label="Criar organização">
          <Field><FieldLabel htmlFor="organization-name">Nome</FieldLabel><Input id="organization-name" name="name" maxLength={100} required /></Field>
          <Field><FieldLabel htmlFor="organization-slug">Identificador na URL</FieldLabel><Input id="organization-slug" name="slug" pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength={80} aria-describedby="slug-help" required /><FieldDescription id="slug-help">Letras minúsculas, números e hífens. Exemplo: minha-equipe.</FieldDescription></Field>
        </OrganizationForm>
      </CardContent>
    </Card>}
  </main>;
}
