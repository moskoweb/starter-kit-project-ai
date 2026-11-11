import Link from "next/link";
import { getAuth, resolveTenant } from "@vibe/auth";
import { getIdentityEnv } from "@vibe/config/env";
import { notFound } from "next/navigation";
import { pageSession } from "../../../lib/identity-session";
import { buildPanelPath } from "../../../lib/panels/routing";
import { OrganizationForm } from "../../../components/identity/organization-form";
function RoleOptions() { return <><option value="viewer">Leitor</option><option value="member">Membro</option><option value="admin">Administrador</option><option value="owner">Proprietário</option></>; }
export default async function Page({ params }: { params: Promise<{ identifier: string }> }) {
 const { headers } = await pageSession(); if (getIdentityEnv().IDENTITY_PROFILE === "personal") notFound();
 const { identifier } = await params;
 const tenant = await resolveTenant(identifier, headers).catch((error: unknown) => { if (error instanceof Error && error.message === "NOT_FOUND") notFound(); throw error; });
 const organization = await getAuth().api.getFullOrganization({ headers, query: { organizationId: tenant.id } }); if (!organization) notFound();
 const manager = tenant.role.split(",").some((role) => role === "owner" || role === "admin");
 return <main className="mx-auto max-w-4xl space-y-8 p-6"><Link className="underline" href="/organizations">Organizações</Link><h1 className="text-3xl font-semibold">{tenant.name}</h1><p>Sua função: {tenant.role}</p><Link className="underline" href={buildPanelPath("organization", { tenant: tenant.slug })}>Abrir painel da organização</Link>
 <section className="space-y-4"><h2 className="text-xl font-semibold">Membros</h2><ul className="divide-y">{organization.members.map((member) => <li className="space-y-3 py-4" key={member.id}><p>{member.user.name} · {member.user.email} · {member.role}</p>{manager && <div className="flex flex-wrap gap-4"><OrganizationForm action="role" organizationId={tenant.id} targetId={member.id} label="Alterar função"><label className="block">Função de {member.user.name}<select className="ml-2 rounded-md border p-2" name="role" defaultValue={member.role}><RoleOptions /></select></label></OrganizationForm><OrganizationForm action="remove" organizationId={tenant.id} targetId={member.id} label={"Remover " + member.user.name} /></div>}</li>)}</ul></section>
 {manager && <><section className="space-y-4"><h2 className="text-xl font-semibold">Convidar membro</h2><OrganizationForm action="invite" organizationId={tenant.id} label="Enviar convite"><label className="block">Email<input className="mt-1 block w-full rounded-md border p-3" type="email" name="email" maxLength={254} required /></label><label className="block">Função<select className="ml-2 rounded-md border p-2" name="role" defaultValue="member"><RoleOptions /></select></label></OrganizationForm></section>
 <section className="space-y-4"><h2 className="text-xl font-semibold">Convites</h2>{organization.invitations.length ? <ul className="divide-y">{organization.invitations.map((invitation) => <li className="space-y-3 py-4" key={invitation.id}><p>{invitation.email} · {invitation.role} · {invitation.status} · Expira em {new Date(invitation.expiresAt).toLocaleString("pt-BR")}</p>{invitation.status === "pending" && <div className="flex flex-wrap gap-4"><OrganizationForm action="resend" organizationId={tenant.id} email={invitation.email} role={invitation.role} label="Reenviar convite" /><OrganizationForm action="cancel" targetId={invitation.id} label="Cancelar convite" /></div>}</li>)}</ul> : <p>Nenhum convite.</p>}</section></>}
 </main>;
}
