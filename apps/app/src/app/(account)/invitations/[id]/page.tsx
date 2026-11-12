import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MailCheck, MailX } from "lucide-react";
import { getAuth } from "@vibe/auth";
import { getIdentityEnv } from "@vibe/config/env";
import { Card, CardContent } from "@vibe/ui/components/card";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@vibe/ui/components/empty";
import { PageHeader } from "@vibe/ui/components/resource/page-header";
import { OrganizationForm } from "@/components/identity/organization-form";
import { pageSession } from "@/lib/identity-session";

export const metadata: Metadata = { title: "Convite" };

export default async function InvitationPage({ params }: { params: Promise<{ id: string }> }) {
  const { session, headers } = await pageSession();
  if (getIdentityEnv().IDENTITY_PROFILE === "personal") notFound();
  const { id } = await params;
  const invitation = await getAuth().api.getInvitation({ headers, query: { id } }).catch(() => null);
  const valid = invitation && invitation.email.toLowerCase() === session.user.email.toLowerCase() && invitation.status === "pending" && new Date(invitation.expiresAt).getTime() > Date.now();
  return <>
    <PageHeader title="Convite para organização" breadcrumbs={[{ label: "Organizações", href: "/organizations" }, { label: "Convite" }]} />
    <Card><CardContent>
      {valid ? <Empty>
        <EmptyHeader><EmptyMedia variant="icon"><MailCheck /></EmptyMedia><EmptyTitle>{invitation.organizationName}</EmptyTitle><EmptyDescription>Você foi convidado com a função {invitation.role}.</EmptyDescription></EmptyHeader>
        <EmptyContent><div className="flex gap-2"><OrganizationForm action="reject" targetId={id} label="Rejeitar" /><OrganizationForm action="accept" targetId={id} label="Aceitar convite" /></div></EmptyContent>
      </Empty> : <Empty>
        <EmptyHeader><EmptyMedia variant="icon"><MailX /></EmptyMedia><EmptyTitle>Convite indisponível</EmptyTitle><EmptyDescription role="alert">O convite expirou, já foi usado ou pertence a outra conta. Entre com o email que recebeu o convite ou solicite um novo.</EmptyDescription></EmptyHeader>
      </Empty>}
    </CardContent></Card>
  </>;
}
