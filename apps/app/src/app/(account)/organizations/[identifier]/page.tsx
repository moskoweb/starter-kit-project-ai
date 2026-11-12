import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, MailPlus } from "lucide-react";
import { getAuth, resolveTenant } from "@vibe/auth";
import { getIdentityEnv } from "@vibe/config/env";
import { Avatar, AvatarFallback } from "@vibe/ui/components/avatar";
import { Badge } from "@vibe/ui/components/badge";
import { buttonVariants } from "@vibe/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@vibe/ui/components/card";
import { Empty, EmptyHeader, EmptyTitle } from "@vibe/ui/components/empty";
import { Field, FieldLabel } from "@vibe/ui/components/field";
import { Input } from "@vibe/ui/components/input";
import { NativeSelect, NativeSelectOption } from "@vibe/ui/components/native-select";
import { PageHeader } from "@vibe/ui/components/resource/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@vibe/ui/components/table";
import { OrganizationForm } from "@/components/identity/organization-form";
import { pageSession } from "@/lib/identity-session";
import { buildPanelPath } from "@/lib/panels/routing";

const roleLabels: Record<string, string> = { viewer: "Leitor", member: "Membro", admin: "Administrador", owner: "Proprietário" };
const statusLabels: Record<string, string> = { pending: "Pendente", accepted: "Aceito", rejected: "Rejeitado", canceled: "Cancelado" };
function RoleOptions() { return <>{Object.entries(roleLabels).map(([value, label]) => <NativeSelectOption key={value} value={value}>{label}</NativeSelectOption>)}</>; }
const roleText = (role: string) => role.split(",").map(value => roleLabels[value.trim()] ?? value).join(", ");

export const metadata: Metadata = { title: "Organização" };

export default async function OrganizationPage({ params }: { params: Promise<{ identifier: string }> }) {
  const { headers } = await pageSession();
  if (getIdentityEnv().IDENTITY_PROFILE === "personal") notFound();
  const { identifier } = await params;
  const tenant = await resolveTenant(identifier, headers).catch((error: unknown) => { if (error instanceof Error && error.message === "NOT_FOUND") notFound(); throw error; });
  const organization = await getAuth().api.getFullOrganization({ headers, query: { organizationId: tenant.id } });
  if (!organization) notFound();
  const manager = tenant.role.split(",").some(role => role === "owner" || role === "admin");
  return <>
    <PageHeader title={tenant.name} description={`Sua função: ${roleText(tenant.role)}`} breadcrumbs={[{ label: "Organizações", href: "/organizations" }, { label: tenant.name }]}
      actions={<Link href={buildPanelPath("organization", { tenant: tenant.slug })} className={buttonVariants()}>Abrir painel<ArrowRight data-icon="inline-end" /></Link>} />
    <Card>
      <CardHeader><CardTitle>Membros</CardTitle><CardDescription>{organization.members.length} membro(s)</CardDescription></CardHeader>
      <CardContent className="px-0">
        <Table>
          <TableHeader><TableRow><TableHead className="pl-6">Membro</TableHead><TableHead>Função</TableHead>{manager && <TableHead className="pr-6 text-right">Ações</TableHead>}</TableRow></TableHeader>
          <TableBody>{organization.members.map(member => <TableRow key={member.id}>
            <TableCell className="pl-6"><div className="flex items-center gap-3"><Avatar className="size-8"><AvatarFallback>{member.user.name.slice(0, 2).toUpperCase()}</AvatarFallback></Avatar><div className="flex flex-col"><span className="font-medium">{member.user.name}</span><span className="text-xs text-muted-foreground">{member.user.email}</span></div></div></TableCell>
            <TableCell>{manager ? <OrganizationForm action="role" organizationId={tenant.id} targetId={member.id} label="Salvar" size="sm"><div className="flex items-center gap-2"><label className="sr-only" htmlFor={`role-${member.id}`}>Função de {member.user.name}</label><NativeSelect id={`role-${member.id}`} name="role" size="sm" defaultValue={member.role}><RoleOptions /></NativeSelect></div></OrganizationForm> : <Badge variant="secondary">{roleText(member.role)}</Badge>}</TableCell>
            {manager && <TableCell className="pr-6 text-right"><OrganizationForm action="remove" organizationId={tenant.id} targetId={member.id} label="Remover" size="sm" /></TableCell>}
          </TableRow>)}</TableBody>
        </Table>
      </CardContent>
    </Card>
    {manager && <>
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><MailPlus className="size-4" />Convidar membro</CardTitle><CardDescription>O convidado recebe um link por email.</CardDescription></CardHeader>
        <CardContent>
          <OrganizationForm action="invite" organizationId={tenant.id} label="Enviar convite">
            <div className="grid gap-6 md:grid-cols-2">
              <Field><FieldLabel htmlFor="invite-email">Email</FieldLabel><Input id="invite-email" type="email" name="email" maxLength={254} required /></Field>
              <Field><FieldLabel htmlFor="invite-role">Função</FieldLabel><NativeSelect id="invite-role" name="role" className="w-full" defaultValue="member"><RoleOptions /></NativeSelect></Field>
            </div>
          </OrganizationForm>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Convites</CardTitle></CardHeader>
        <CardContent className="px-0">{organization.invitations.length ? <Table>
          <TableHeader><TableRow><TableHead className="pl-6">Email</TableHead><TableHead>Função</TableHead><TableHead>Status</TableHead><TableHead>Expira em</TableHead><TableHead className="pr-6 text-right">Ações</TableHead></TableRow></TableHeader>
          <TableBody>{organization.invitations.map(invitation => <TableRow key={invitation.id}>
            <TableCell className="pl-6">{invitation.email}</TableCell>
            <TableCell>{roleText(invitation.role)}</TableCell>
            <TableCell><Badge variant={invitation.status === "pending" ? "default" : "secondary"}>{statusLabels[invitation.status] ?? invitation.status}</Badge></TableCell>
            <TableCell>{new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(invitation.expiresAt))}</TableCell>
            <TableCell className="pr-6">{invitation.status === "pending" && <div className="flex justify-end gap-2"><OrganizationForm action="resend" organizationId={tenant.id} email={invitation.email} role={invitation.role} label="Reenviar" size="sm" /><OrganizationForm action="cancel" targetId={invitation.id} label="Cancelar" size="sm" /></div>}</TableCell>
          </TableRow>)}</TableBody>
        </Table> : <Empty className="py-6"><EmptyHeader><EmptyTitle>Nenhum convite</EmptyTitle></EmptyHeader></Empty>}</CardContent>
      </Card>
    </>}
  </>;
}
