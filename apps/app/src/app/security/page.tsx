import { cookies } from "next/headers";
import { pageSession } from "../../lib/identity-session";
import { SecurityForm } from "../../components/auth/security-form";

export const dynamic = "force-dynamic";

export default async function SecurityPage() {
  await pageSession();
  const locale = (await cookies()).get("locale")?.value === "en" ? "en" : "pt-BR";
  return <main><h1>{locale === "en" ? "Security" : "Segurança"}</h1><SecurityForm locale={locale} /></main>;
}
