import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Building2 } from "lucide-react";
import { getAuth } from "@vibe/auth";
import { getIdentityEnv } from "@vibe/config/env";
import { buttonVariants } from "@vibe/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@vibe/ui/components/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@vibe/ui/components/empty";
import { Field, FieldDescription, FieldLabel } from "@vibe/ui/components/field";
import { Input } from "@vibe/ui/components/input";
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemTitle } from "@vibe/ui/components/item";
import { PageHeader } from "@vibe/ui/components/resource/page-header";
import { OrganizationForm } from "@/components/identity/organization-form";
import { pageSession } from "@/lib/identity-session";
import { buildPanelPath } from "@/lib/panels/routing";

export const metadata: Metadata = { title: "Organizações" };

export default async function OrganizationsPage() {
  const { headers } = await pageSession();
  const env = getIdentityEnv();
  if (env.IDENTITY_PROFILE === "personal") notFound();
  const single = env.ORGANIZATION_MODE === "single";
  const organizations = (await getAuth().api.listOrganizations({ headers })).filter(org => !single || org.id === env.SINGLE_ORGANIZATION_ID);
  return <>
    <PageHeader title="Organizações" description="Espaços de trabalho compartilhados dos quais você participa." />
    <Card>
      <CardContent>
        {organizations.length ? <ItemGroup className="gap-2">{organizations.map(org => <Item key={org.id} variant="outline">
          <ItemMedia variant="icon"><Building2 /></ItemMedia>
          <ItemContent><ItemTitle><Link href={`/organizations/${encodeURIComponent(org.slug)}`} className="hover:underline">{org.name}</Link></ItemTitle><ItemDescription>{org.slug}</ItemDescription></ItemContent>
          <ItemActions>
            <Link href={`/organizations/${encodeURIComponent(org.slug)}`} className={buttonVariants({ variant: "outline", size: "sm" })}>Gerenciar</Link>
            <Link href={buildPanelPath("organization", { tenant: org.slug })} className={buttonVariants({ size: "sm" })}>Abrir painel<ArrowRight data-icon="inline-end" /></Link>
          </ItemActions>
        </Item>)}</ItemGroup> : <Empty><EmptyHeader><EmptyMedia variant="icon"><Building2 /></EmptyMedia><EmptyTitle>Nenhuma organização</EmptyTitle><EmptyDescription>{single ? "Aceite um convite recebido por email ou solicite acesso ao operador." : "Crie uma organização ou aceite um convite recebido por email."}</EmptyDescription></EmptyHeader></Empty>}
      </CardContent>
    </Card>
    {single ? <p className="text-sm text-muted-foreground">Este aplicativo usa uma única organização. O operador deve provisioná-la e convidar os participantes; a criação de organizações está desabilitada.</p> : <Card>
      <CardHeader><CardTitle>Criar organização</CardTitle><CardDescription>Informe o nome e o identificador usado na URL.</CardDescription></CardHeader>
      <CardContent>
        <OrganizationForm action="create" label="Criar organização">
          <div className="grid gap-6 md:grid-cols-2">
            <Field><FieldLabel htmlFor="organization-name">Nome</FieldLabel><Input id="organization-name" name="name" maxLength={100} required /></Field>
            <Field><FieldLabel htmlFor="organization-slug">Identificador na URL</FieldLabel><Input id="organization-slug" name="slug" pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength={80} aria-describedby="slug-help" required /><FieldDescription id="slug-help">Letras minúsculas, números e hífens. Exemplo: minha-equipe.</FieldDescription></Field>
          </div>
        </OrganizationForm>
      </CardContent>
    </Card>}
  </>;
}
