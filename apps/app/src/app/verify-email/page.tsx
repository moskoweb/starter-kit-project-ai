import { AuthForm } from "@/components/auth/auth-form";
import { cookies } from "next/headers";
export default async function VerifyEmailPage() { const locale = (await cookies()).get("locale")?.value === "en" ? "en" : "pt-BR"; return <AuthForm mode="verify" locale={locale} />; }
