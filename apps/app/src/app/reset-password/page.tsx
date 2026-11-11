import { AuthForm } from "@/components/auth/auth-form";
import { cookies } from "next/headers";
export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const locale = (await cookies()).get("locale")?.value === "en" ? "en" : "pt-BR";
  return <AuthForm mode="reset" token={token} locale={locale} />;
}
