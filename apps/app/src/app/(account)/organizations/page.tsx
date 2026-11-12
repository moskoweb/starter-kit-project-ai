import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Building2 } from "lucide-react";
import { getAuth } from "@vibe/auth";
import { getIdentityEnv } from "@vibe/config/env";
import { buttonVariants } from "@vibe/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@vibe/ui/components/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@vibe/ui/components/empty";
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemTitle } from "@vibe/ui/components/item";
import { PageHeader } from "@vibe/ui/components/resource/page-header";
import { CreateOrganizationForm } from "@/components/organization/create-organization";
import { pageSession } from "@/lib/identity-session";
import { currentLocale } from "@/lib/panels/chrome";
import { organizationPanelPath } from "@/lib/panels/routing";

const text = {
  "pt-BR": {
    title: "Organizações", description: "Espaços de trabalho compartilhados dos quais você participa.", manage: "Configurações", open: "Abrir painel",
    empty: "Nenhuma organização", emptySingle: "Aceite um convite recebido por email ou solicite acesso ao operador.", emptyMulti: "Crie uma organização ou aceite um convite recebido por email.",
    single: "Este aplicativo usa uma única organização. O operador deve provisioná-la e convidar os participantes; a criação de organizações está desabilitada.",
    create: "Criar organização", createDescription: "Informe o nome e o identificador usado na URL.",
  },
  en: {
    title: "Organizations", description: "Shared workspaces you belong to.", manage: "Settings", open: "Open panel",
    empty: "No organizations", emptySingle: "Accept an invitation received by email or ask the operator for access.", emptyMulti: "Create an organization or accept an invitation received by email.",
    single: "This app uses a single organization. The operator provisions it and invites participants; creating organizations is disabled.",
    create: "Create organization", createDescription: "Enter the name and the identifier used in the URL.",
  },
};

export const metadata: Metadata = { title: "Organizações" };

export default async function OrganizationsPage() {
  const { headers } = await pageSession();
  const env = getIdentityEnv();
  if (env.IDENTITY_PROFILE === "personal") notFound();
  const locale = await currentLocale();
  const copy = text[locale];
  const single = env.ORGANIZATION_MODE === "single";
  const organizations = (await getAuth().api.listOrganizations({ headers })).filter(org => !single || org.id === env.SINGLE_ORGANIZATION_ID);
  return <>
    <PageHeader title={copy.title} description={copy.description} />
    <Card>
      <CardContent>
        {organizations.length ? <ItemGroup className="gap-2">{organizations.map(org => <Item key={org.id} variant="outline">
          <ItemMedia variant="icon"><Building2 /></ItemMedia>
          <ItemContent><ItemTitle><Link href={`/organizations/${encodeURIComponent(org.slug)}`} className="hover:underline">{org.name}</Link></ItemTitle><ItemDescription>{org.slug}</ItemDescription></ItemContent>
          <ItemActions>
            <Link href={`/organizations/${encodeURIComponent(org.slug)}`} className={buttonVariants({ variant: "outline", size: "sm" })}>{copy.manage}</Link>
            {organizationPanelPath(org) && <Link href={organizationPanelPath(org)!} className={buttonVariants({ size: "sm" })}>{copy.open}<ArrowRight data-icon="inline-end" /></Link>}
          </ItemActions>
        </Item>)}</ItemGroup> : <Empty><EmptyHeader><EmptyMedia variant="icon"><Building2 /></EmptyMedia><EmptyTitle>{copy.empty}</EmptyTitle><EmptyDescription>{single ? copy.emptySingle : copy.emptyMulti}</EmptyDescription></EmptyHeader></Empty>}
      </CardContent>
    </Card>
    {single ? <p className="text-sm text-muted-foreground">{copy.single}</p> : <Card>
      <CardHeader><CardTitle>{copy.create}</CardTitle><CardDescription>{copy.createDescription}</CardDescription></CardHeader>
      <CardContent><CreateOrganizationForm locale={locale} /></CardContent>
    </Card>}
  </>;
}
