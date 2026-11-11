import { cookies } from "next/headers";
import { TwoFactorForm } from "../../components/auth/two-factor-form";

export default async function TwoFactorPage() {
  const locale = (await cookies()).get("locale")?.value === "en" ? "en" : "pt-BR";
  return <main><h1>{locale === "en" ? "Two-factor verification" : "Verificação em duas etapas"}</h1><p>{locale === "en" ? "Confirm your identity to continue." : "Confirme sua identidade para continuar."}</p><TwoFactorForm locale={locale} /></main>;
}
