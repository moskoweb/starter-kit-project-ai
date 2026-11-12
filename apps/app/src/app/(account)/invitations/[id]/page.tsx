import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MailCheck, MailX } from "lucide-react";
import { getAuth } from "@vibe/auth";
import { getIdentityEnv } from "@vibe/config/env";
import { Card, CardContent } from "@vibe/ui/components/card";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@vibe/ui/components/empty";
import { PageHeader } from "@vibe/ui/components/resource/page-header";
import { OrganizationForm } from "@/components/identity/organization-form";
import { roleText } from "@/components/organization/shared";
import { pageSession } from "@/lib/identity-session";
import { currentLocale } from "@/lib/panels/chrome";

const text = {
  "pt-BR": {
    title: "Convite para organização", organizations: "Organizações", invitation: "Convite", invitedAs: (role: string) => `Você foi convidado com a função ${role}.`,
    reject: "Rejeitar", accept: "Aceitar convite", unavailable: "Convite indisponível",
    unavailableDescription: "O convite expirou, já foi usado ou pertence a outra conta. Entre com o email que recebeu o convite ou solicite um novo.",
  },
  en: {
    title: "Organization invitation", organizations: "Organizations", invitation: "Invitation", invitedAs: (role: string) => `You were invited with the ${role} role.`,
    reject: "Reject", accept: "Accept invitation", unavailable: "Invitation unavailable",
    unavailableDescription: "The invitation expired, was already used or belongs to another account. Sign in with the invited email or request a new one.",
  },
};

export const metadata: Metadata = { title: "Convite" };

/** Dynamic server page: evaluated per request, so wall-clock time is the intended input. */
const isFuture = (date: Date | string) => new Date(date).getTime() > Date.now();

export default async function InvitationPage({ params }: { params: Promise<{ id: string }> }) {
  const { session, headers } = await pageSession();
  if (getIdentityEnv().IDENTITY_PROFILE === "personal") notFound();
  const { id } = await params;
  const locale = await currentLocale();
  const copy = text[locale];
  const invitation = await getAuth().api.getInvitation({ headers, query: { id } }).catch(() => null);
  const valid = invitation && invitation.email.toLowerCase() === session.user.email.toLowerCase() && invitation.status === "pending" && isFuture(invitation.expiresAt);
  return <>
    <PageHeader title={copy.title} breadcrumbs={[{ label: copy.organizations, href: "/organizations" }, { label: copy.invitation }]} />
    <Card><CardContent>
      {valid ? <Empty>
        <EmptyHeader><EmptyMedia variant="icon"><MailCheck /></EmptyMedia><EmptyTitle>{invitation.organizationName}</EmptyTitle><EmptyDescription>{copy.invitedAs(roleText(invitation.role, locale))}</EmptyDescription></EmptyHeader>
        <EmptyContent><div className="flex gap-2"><OrganizationForm action="reject" targetId={id} label={copy.reject} locale={locale} /><OrganizationForm action="accept" targetId={id} label={copy.accept} locale={locale} /></div></EmptyContent>
      </Empty> : <Empty>
        <EmptyHeader><EmptyMedia variant="icon"><MailX /></EmptyMedia><EmptyTitle>{copy.unavailable}</EmptyTitle><EmptyDescription role="alert">{copy.unavailableDescription}</EmptyDescription></EmptyHeader>
      </Empty>}
    </CardContent></Card>
  </>;
}
