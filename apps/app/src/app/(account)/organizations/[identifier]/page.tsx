import Link from "next/link";
import { getAuth, resolveTenant } from "@vibe/auth";
import { getIdentityEnv } from "@vibe/config/env";
import { notFound } from "next/navigation";
import { Button } from "@vibe/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@vibe/ui/components/card";
import { Field, FieldLabel } from "@vibe/ui/components/field";
import { Input } from "@vibe/ui/components/input";
import { NativeSelect, NativeSelectOption } from "@vibe/ui/components/native-select";
import { pageSession } from "../../../lib/identity-session";
import { buildPanelPath } from "../../../lib/panels/routing";
import { OrganizationForm } from "../../../components/identity/organization-form";
function RoleOptions() { return <><NativeSelectOption value="viewer">Leitor</NativeSelectOption><NativeSelectOption value="member">Membro</NativeSelectOption><NativeSelectOption value="admin">Administrador</NativeSelectOption><NativeSelectOption value="owner">Proprietário</NativeSelectOption></>; }
export default async function Page({ params }: { params: Promise<{ identifier: string }> }) {
 const { headers } = await pageSession(); if (getIdentityEnv().IDENTITY_PROFILE === "personal") notFound();
 const { identifier } = await params;
 const tenant = await resolveTenant(identifier, headers).catch((error: unknown) => { if (error instanceof Error && error.message === "NOT_FOUND") notFound(); throw error; });
 const organization = await getAuth().api.getFullOrganization({ headers, query: { organizationId: tenant.id } }); if (!organization) notFound();
 const manager = tenant.role.split(",").some((role) => role === "owner" || role === "admin");
 return <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
  <div><Button asChild variant="link" className="px-0"><Link href="/organizations">Organizações</Link></Button></div>
  <Card>
   <CardHeader><CardTitle><h1>{tenant.name}</h1></CardTitle><CardDescription>Sua função: {tenant.role}</CardDescription></CardHeader>
   <CardContent><Button asChild variant="outline"><Link href={buildPanelPath("organization", { tenant: tenant.slug })}>Abrir painel da organização</Link></Button></CardContent>
  </Card>
  <Card>
   <CardHeader><CardTitle><h2>Membros</h2></CardTitle></CardHeader>
   <CardContent><ul className="divide-y">{organization.members.map((member) => <li className="flex flex-col gap-3 py-4" key={member.id}><p>{member.user.name} · {member.user.email} · {member.role}</p>{manager && <div className="flex flex-wrap items-end gap-4"><OrganizationForm action="role" organizationId={tenant.id} targetId={member.id} label="Alterar função"><Field><FieldLabel htmlFor={"role-" + member.id}>Função de {member.user.name}</FieldLabel><NativeSelect id={"role-" + member.id} name="role" defaultValue={member.role}><RoleOptions /></NativeSelect></Field></OrganizationForm><OrganizationForm action="remove" organizationId={tenant.id} targetId={member.id} label={"Remover " + member.user.name} /></div>}</li>)}</ul></CardContent>
  </Card>
  {manager && <>
   <Card>
    <CardHeader><CardTitle><h2>Convidar membro</h2></CardTitle></CardHeader>
    <CardContent><OrganizationForm action="invite" organizationId={tenant.id} label="Enviar convite"><Field><FieldLabel htmlFor="invite-email">Email</FieldLabel><Input id="invite-email" type="email" name="email" maxLength={254} required /></Field><Field><FieldLabel htmlFor="invite-role">Função</FieldLabel><NativeSelect id="invite-role" name="role" defaultValue="member"><RoleOptions /></NativeSelect></Field></OrganizationForm></CardContent>
   </Card>
   <Card>
    <CardHeader><CardTitle><h2>Convites</h2></CardTitle></CardHeader>
    <CardContent>{organization.invitations.length ? <ul className="divide-y">{organization.invitations.map((invitation) => <li className="flex flex-col gap-3 py-4" key={invitation.id}><p>{invitation.email} · {invitation.role} · {invitation.status} · Expira em {new Date(invitation.expiresAt).toLocaleString("pt-BR")}</p>{invitation.status === "pending" && <div className="flex flex-wrap gap-4"><OrganizationForm action="resend" organizationId={tenant.id} email={invitation.email} role={invitation.role} label="Reenviar convite" /><OrganizationForm action="cancel" targetId={invitation.id} label="Cancelar convite" /></div>}</li>)}</ul> : <p className="text-muted-foreground">Nenhum convite.</p>}</CardContent>
   </Card>
  </>}
 </main>;
}
