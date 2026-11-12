import Link from "next/link";
import { getAuth } from "@vibe/auth";
import { getIdentityEnv } from "@vibe/config/env";
import { notFound } from "next/navigation";
import { Button } from "@vibe/ui/components/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@vibe/ui/components/card";
import { pageSession } from "../../../lib/identity-session";
import { OrganizationForm } from "../../../components/identity/organization-form";
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { session, headers } = await pageSession(); if (getIdentityEnv().IDENTITY_PROFILE === "personal") notFound();
  const { id } = await params;
  const invitation = await getAuth().api.getInvitation({ headers, query: { id } }).catch(() => null);
  const valid = invitation && invitation.email.toLowerCase() === session.user.email.toLowerCase() && invitation.status === "pending" && new Date(invitation.expiresAt).getTime() > Date.now();
  return <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
    <Card>
      <CardHeader>
        <CardTitle><h1>Convite para organização</h1></CardTitle>
        {valid && <CardDescription>Você foi convidado para {invitation.organizationName} com função {invitation.role}.</CardDescription>}
      </CardHeader>
      <CardContent className="flex flex-wrap gap-4">
        {valid ? <><OrganizationForm action="accept" targetId={id} label="Aceitar convite" /><OrganizationForm action="reject" targetId={id} label="Rejeitar convite" /></> : <p role="alert" className="text-sm text-destructive">Convite indisponível, expirado ou destinado a outra conta. Entre com o email que recebeu o convite ou solicite um novo.</p>}
      </CardContent>
      <CardFooter><Button asChild variant="link" className="px-0"><Link href="/account">Minha conta</Link></Button></CardFooter>
    </Card>
  </main>;
}
