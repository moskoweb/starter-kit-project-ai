import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, MailPlus } from "lucide-react";
import { getAuth, resolveTenant } from "@vibe/auth";
import { getIdentityEnv } from "@vibe/config/env";
import { Alert, AlertDescription, AlertTitle } from "@vibe/ui/components/alert";
import { Avatar, AvatarFallback } from "@vibe/ui/components/avatar";
import { Badge } from "@vibe/ui/components/badge";
import { buttonVariants } from "@vibe/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@vibe/ui/components/card";
import { Empty, EmptyHeader, EmptyTitle } from "@vibe/ui/components/empty";
import { Field, FieldLabel } from "@vibe/ui/components/field";
import { Input } from "@vibe/ui/components/input";
import { PageHeader } from "@vibe/ui/components/resource/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@vibe/ui/components/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@vibe/ui/components/tabs";
import { OrganizationForm } from "@/components/identity/organization-form";
import { FormSelect } from "@/components/organization/form-select";
import { DeleteOrganization, LeaveOrganization, OrganizationGeneralForm, TransferOwnership } from "@/components/organization/settings";
import { hasRole, organizationRoles, roleLabels, roleText } from "@/components/organization/shared";
import { pageSession } from "@/lib/identity-session";
import { currentLocale } from "@/lib/panels/chrome";
import { organizationPanelPath } from "@/lib/panels/routing";

const text = {
  "pt-BR": {
    breadcrumb: "Organizações", yourRole: "Sua função", openPanel: "Abrir painel",
    tabs: { general: "Geral", members: "Membros", invitations: "Convites", danger: "Zona de perigo" },
    general: "Dados da organização", generalDescription: "Nome exibido e identificador usado na URL do painel.", generalReadOnly: "Somente proprietários e administradores podem editar.",
    members: "Membros", memberCount: (count: number) => `${count} membro(s)`, member: "Membro", role: "Função", actions: "Ações", roleOf: (name: string) => `Função de ${name}`, saveRole: "Salvar", remove: "Remover", you: "Você",
    transfer: "Transferir propriedade", transferDescription: "Escolha um membro para se tornar proprietário. Sua função passa a Administrador.", noTransfer: "Nenhum outro membro disponível.",
    invite: "Convidar membro", inviteDescription: "O convidado recebe um link por email.", email: "Email", sendInvite: "Enviar convite",
    invitations: "Convites", status: "Status", expires: "Expira em", noInvitations: "Nenhum convite", resend: "Reenviar", cancel: "Cancelar",
    statuses: { pending: "Pendente", accepted: "Aceito", rejected: "Rejeitado", canceled: "Cancelado" } as Record<string, string>,
    leave: "Sair da organização", leaveDescription: "Remove sua associação com esta organização.", lastOwnerTitle: "Você é o único proprietário",
    lastOwner: "Transfira a propriedade na aba Membros ou exclua a organização antes de sair.",
    deleteOrganization: "Excluir organização", removeDescription: "Exclui permanentemente a organização, membros, convites e dados. Somente proprietários.",
  },
  en: {
    breadcrumb: "Organizations", yourRole: "Your role", openPanel: "Open panel",
    tabs: { general: "General", members: "Members", invitations: "Invitations", danger: "Danger zone" },
    general: "Organization details", generalDescription: "Display name and identifier used in the panel URL.", generalReadOnly: "Only owners and admins can edit.",
    members: "Members", memberCount: (count: number) => `${count} member(s)`, member: "Member", role: "Role", actions: "Actions", roleOf: (name: string) => `Role of ${name}`, saveRole: "Save", remove: "Remove", you: "You",
    transfer: "Transfer ownership", transferDescription: "Choose a member to become owner. Your role becomes Admin.", noTransfer: "No other member available.",
    invite: "Invite member", inviteDescription: "The invitee receives a link by email.", email: "Email", sendInvite: "Send invitation",
    invitations: "Invitations", status: "Status", expires: "Expires at", noInvitations: "No invitations", resend: "Resend", cancel: "Cancel",
    statuses: { pending: "Pending", accepted: "Accepted", rejected: "Rejected", canceled: "Canceled" } as Record<string, string>,
    leave: "Leave organization", leaveDescription: "Removes your membership in this organization.", lastOwnerTitle: "You are the only owner",
    lastOwner: "Transfer ownership in the Members tab or delete the organization before leaving.",
    deleteOrganization: "Delete organization", removeDescription: "Permanently deletes the organization, members, invitations and data. Owners only.",
  },
};

export const metadata: Metadata = { title: "Organização" };

export default async function OrganizationPage({ params }: { params: Promise<{ identifier: string }> }) {
  const { session, headers } = await pageSession();
  if (getIdentityEnv().IDENTITY_PROFILE === "personal") notFound();
  const { identifier } = await params;
  const tenant = await resolveTenant(identifier, headers).catch((error: unknown) => { if (error instanceof Error && error.message === "NOT_FOUND") notFound(); throw error; });
  const organization = await getAuth().api.getFullOrganization({ headers, query: { organizationId: tenant.id } });
  if (!organization) notFound();
  const locale = await currentLocale();
  const copy = text[locale];
  // UI gating only; Better Auth re-checks every mutation server-side.
  const owner = hasRole(tenant.role, "owner");
  const manager = owner || hasRole(tenant.role, "admin");
  const self = organization.members.find(member => member.userId === session.user.id);
  const ownerCount = organization.members.filter(member => hasRole(member.role, "owner")).length;
  const roleItems = organizationRoles.filter(role => owner || role !== "owner").map(role => ({ value: role, label: roleLabels[locale][role] }));
  const dateFormat = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" });
  const others = organization.members.filter(member => member.id !== self?.id && !hasRole(member.role, "owner"));

  return <>
    <PageHeader title={tenant.name} description={`${copy.yourRole}: ${roleText(tenant.role, locale)}`} breadcrumbs={[{ label: copy.breadcrumb, href: "/organizations" }, { label: tenant.name }]}
      actions={organizationPanelPath(tenant) && <Link href={organizationPanelPath(tenant)!} className={buttonVariants()}>{copy.openPanel}<ArrowRight data-icon="inline-end" /></Link>} />
    <Tabs defaultValue="general">
      <TabsList>
        <TabsTrigger value="general">{copy.tabs.general}</TabsTrigger>
        <TabsTrigger value="members">{copy.tabs.members}</TabsTrigger>
        {manager && <TabsTrigger value="invitations">{copy.tabs.invitations}</TabsTrigger>}
        <TabsTrigger value="danger">{copy.tabs.danger}</TabsTrigger>
      </TabsList>

      <TabsContent value="general">
        <Card>
          <CardHeader><CardTitle>{copy.general}</CardTitle><CardDescription>{manager ? copy.generalDescription : copy.generalReadOnly}</CardDescription></CardHeader>
          <CardContent>{manager ? <OrganizationGeneralForm key={tenant.slug} organizationId={tenant.id} name={tenant.name} slug={tenant.slug} locale={locale} />
            : <p className="text-sm">{tenant.name} · <span className="font-mono text-muted-foreground">{tenant.slug}</span></p>}</CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="members" className="flex flex-col gap-4">
        <Card>
          <CardHeader><CardTitle>{copy.members}</CardTitle><CardDescription>{copy.memberCount(organization.members.length)}</CardDescription></CardHeader>
          <CardContent className="px-0">
            <Table>
              <TableHeader><TableRow><TableHead className="pl-6">{copy.member}</TableHead><TableHead>{copy.role}</TableHead>{manager && <TableHead className="pr-6 text-right">{copy.actions}</TableHead>}</TableRow></TableHeader>
              <TableBody>{organization.members.map(member => {
                const isSelf = member.id === self?.id;
                const editable = manager && !isSelf && (owner || !hasRole(member.role, "owner"));
                return <TableRow key={member.id}>
                  <TableCell className="pl-6"><div className="flex items-center gap-3"><Avatar className="size-8"><AvatarFallback>{member.user.name.slice(0, 2).toUpperCase()}</AvatarFallback></Avatar><div className="flex flex-col"><span className="font-medium">{member.user.name}{isSelf && <Badge variant="outline" className="ml-2">{copy.you}</Badge>}</span><span className="text-xs text-muted-foreground">{member.user.email}</span></div></div></TableCell>
                  <TableCell>{editable ? <OrganizationForm action="role" organizationId={tenant.id} targetId={member.id} label={copy.saveRole} size="sm" locale={locale}><div className="flex items-center gap-2"><FormSelect name="role" size="sm" items={roleItems} defaultValue={member.role} aria-label={copy.roleOf(member.user.name)} /></div></OrganizationForm> : <Badge variant="secondary">{roleText(member.role, locale)}</Badge>}</TableCell>
                  {manager && <TableCell className="pr-6 text-right">{editable && <OrganizationForm action="remove" organizationId={tenant.id} targetId={member.id} label={copy.remove} size="sm" locale={locale} />}</TableCell>}
                </TableRow>;
              })}</TableBody>
            </Table>
          </CardContent>
        </Card>
        {owner && self && <Card>
          <CardHeader><CardTitle>{copy.transfer}</CardTitle><CardDescription>{copy.transferDescription}</CardDescription></CardHeader>
          <CardContent>{others.length ? <TransferOwnership organizationId={tenant.id} selfMemberId={self.id} members={others.map(member => ({ id: member.id, label: `${member.user.name} (${member.user.email})` }))} locale={locale} />
            : <p className="text-sm text-muted-foreground">{copy.noTransfer}</p>}</CardContent>
        </Card>}
      </TabsContent>

      {manager && <TabsContent value="invitations" className="flex flex-col gap-4">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><MailPlus className="size-4" />{copy.invite}</CardTitle><CardDescription>{copy.inviteDescription}</CardDescription></CardHeader>
          <CardContent>
            <OrganizationForm action="invite" organizationId={tenant.id} label={copy.sendInvite} locale={locale}>
              <div className="grid gap-6 md:grid-cols-2">
                <Field><FieldLabel htmlFor="invite-email">{copy.email}</FieldLabel><Input id="invite-email" type="email" name="email" maxLength={254} required /></Field>
                <Field><FieldLabel htmlFor="invite-role">{copy.role}</FieldLabel><FormSelect id="invite-role" name="role" className="w-full" items={roleItems} defaultValue="member" required /></Field>
              </div>
            </OrganizationForm>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>{copy.invitations}</CardTitle></CardHeader>
          <CardContent className="px-0">{organization.invitations.length ? <Table>
            <TableHeader><TableRow><TableHead className="pl-6">{copy.email}</TableHead><TableHead>{copy.role}</TableHead><TableHead>{copy.status}</TableHead><TableHead>{copy.expires}</TableHead><TableHead className="pr-6 text-right">{copy.actions}</TableHead></TableRow></TableHeader>
            <TableBody>{organization.invitations.map(invitation => <TableRow key={invitation.id}>
              <TableCell className="pl-6">{invitation.email}</TableCell>
              <TableCell>{roleText(invitation.role, locale)}</TableCell>
              <TableCell><Badge variant={invitation.status === "pending" ? "default" : "secondary"}>{copy.statuses[invitation.status] ?? invitation.status}</Badge></TableCell>
              <TableCell>{dateFormat.format(new Date(invitation.expiresAt))}</TableCell>
              <TableCell className="pr-6">{invitation.status === "pending" && <div className="flex justify-end gap-2"><OrganizationForm action="resend" organizationId={tenant.id} email={invitation.email} role={invitation.role} label={copy.resend} size="sm" locale={locale} /><OrganizationForm action="cancel" targetId={invitation.id} label={copy.cancel} size="sm" locale={locale} /></div>}</TableCell>
            </TableRow>)}</TableBody>
          </Table> : <Empty className="py-6"><EmptyHeader><EmptyTitle>{copy.noInvitations}</EmptyTitle></EmptyHeader></Empty>}</CardContent>
        </Card>
      </TabsContent>}

      <TabsContent value="danger" className="flex flex-col gap-4">
        <Card>
          <CardHeader><CardTitle>{copy.leave}</CardTitle><CardDescription>{copy.leaveDescription}</CardDescription></CardHeader>
          <CardContent>{owner && ownerCount <= 1 ? <Alert><AlertTitle>{copy.lastOwnerTitle}</AlertTitle><AlertDescription>{copy.lastOwner}</AlertDescription></Alert>
            : <LeaveOrganization organizationId={tenant.id} locale={locale} />}</CardContent>
        </Card>
        {owner && <Card className="border-destructive/50">
          <CardHeader><CardTitle>{copy.deleteOrganization}</CardTitle><CardDescription>{copy.removeDescription}</CardDescription></CardHeader>
          <CardContent><DeleteOrganization organizationId={tenant.id} slug={tenant.slug} locale={locale} /></CardContent>
        </Card>}
      </TabsContent>
    </Tabs>
  </>;
}
