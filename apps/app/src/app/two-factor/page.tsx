import { cookies } from "next/headers";
import { AuthLayout } from "../../components/auth/auth-layout";
import { TwoFactorForm } from "../../components/auth/two-factor-form";

export default async function TwoFactorPage() {
  const locale = (await cookies()).get("locale")?.value === "en" ? "en" : "pt-BR";
  return <AuthLayout title={locale === "en" ? "Two-factor verification" : "Verificação em duas etapas"} description={locale === "en" ? "Confirm your identity to continue." : "Confirme sua identidade para continuar."}><TwoFactorForm locale={locale} /></AuthLayout>;
}
