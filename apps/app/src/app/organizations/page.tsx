import Link from "next/link";
import { getAuth } from "@vibe/auth";
import { getIdentityEnv } from "@vibe/config/env";
import { notFound } from "next/navigation";
import { pageSession } from "../../lib/identity-session";
import { OrganizationForm } from "../../components/identity/organization-form";
export default async function Page() {
  const { headers } = await pageSession();
  const env = getIdentityEnv();
  if (env.IDENTITY_PROFILE === "personal") notFound();
  const single = env.ORGANIZATION_MODE === "single";
  const organizations = (await getAuth().api.listOrganizations({ headers })).filter((org) => !single || org.id === env.SINGLE_ORGANIZATION_ID);
  return <main className="mx-auto max-w-3xl space-y-8 p-6"><Link className="underline" href="/account">Minha conta</Link><h1 className="text-3xl font-semibold">Organizações</h1>
    {organizations.length ? <ul className="divide-y">{organizations.map((org) => <li className="flex flex-wrap items-center justify-between gap-4 py-4" key={org.id}><Link className="underline" href={"/organizations/" + encodeURIComponent(org.slug)}>{org.name}</Link><OrganizationForm action="select" organizationId={org.id} label="Selecionar contexto" /></li>)}</ul> : <p>{single ? "Você ainda não participa da organização deste aplicativo. Aceite um convite recebido por email ou solicite acesso ao operador." : "Você ainda não participa de uma organização. Crie uma ou aceite um convite recebido por email."}</p>}
    {single ? <p>Este aplicativo usa uma única organização. O operador deve provisioná-la e convidar os participantes; a criação de organizações está desabilitada.</p> : <section className="space-y-4"><h2 className="text-xl font-semibold">Criar organização</h2><OrganizationForm action="create" label="Criar organização"><label className="block">Nome<input className="mt-1 block w-full rounded-md border p-3" name="name" maxLength={100} required /></label><label className="block">Identificador na URL<input className="mt-1 block w-full rounded-md border p-3" name="slug" pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength={80} aria-describedby="slug-help" required /></label><p id="slug-help">Letras minúsculas, números e hífens. Exemplo: minha-equipe.</p></OrganizationForm></section>}
  </main>;
}
