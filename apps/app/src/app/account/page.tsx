import Link from "next/link";
import { getIdentityEnv } from "@vibe/config/env";
import { pageSession } from "../../lib/identity-session";
import { buildPanelPath } from "../../lib/panels/routing";
import { SignOut } from "../../components/identity/sign-out";
export default async function Page() { const { session } = await pageSession(); const profile = getIdentityEnv().IDENTITY_PROFILE;
return <main className="mx-auto max-w-3xl space-y-6 p-6"><h1 className="text-3xl font-semibold">Minha conta</h1><p>{session.user.name}</p><nav className="flex flex-wrap gap-5 underline" aria-label="Conta">{profile !== "organizations" && <Link href={buildPanelPath("personal")}>Painel pessoal</Link>}{profile !== "personal" && <Link href="/organizations">Organizações</Link>}<Link href="/security">Segurança</Link></nav><SignOut /></main>; }
