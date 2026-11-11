import Link from "next/link";
import { getAuth } from "@vibe/auth";
import { getIdentityEnv } from "@vibe/config/env";
import { notFound } from "next/navigation";
import { pageSession } from "../../../lib/identity-session";
import { OrganizationForm } from "../../../components/identity/organization-form";
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { session, headers } = await pageSession(); if (getIdentityEnv().IDENTITY_PROFILE === "personal") notFound();
  const { id } = await params;
  const invitation = await getAuth().api.getInvitation({ headers, query: { id } }).catch(() => null);
  const valid = invitation && invitation.email.toLowerCase() === session.user.email.toLowerCase() && invitation.status === "pending" && new Date(invitation.expiresAt).getTime() > Date.now();
  return <main className="mx-auto max-w-lg space-y-6 p-6"><h1 className="text-3xl font-semibold">Convite para organização</h1>{valid ? <><p>Você foi convidado para {invitation.organizationName} com função {invitation.role}.</p><OrganizationForm action="accept" targetId={id} label="Aceitar convite" /><OrganizationForm action="reject" targetId={id} label="Rejeitar convite" /></> : <p role="alert">Convite indisponível, expirado ou destinado a outra conta. Entre com o email que recebeu o convite ou solicite um novo.</p>}<Link className="underline" href="/account">Minha conta</Link></main>;
}
