import { AuthForm } from "@/components/auth/auth-form";
import { getGoogleEnv } from "@vibe/config/env";
import { cookies } from "next/headers";
export default async function LoginPage() { const locale = (await cookies()).get("locale")?.value === "en" ? "en" : "pt-BR"; return <AuthForm mode="login" locale={locale} google={getGoogleEnv().enabled} />; }
