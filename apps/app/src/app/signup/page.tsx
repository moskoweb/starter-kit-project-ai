import { AuthForm } from "@/components/auth/auth-form";
import { getGoogleEnv } from "@vibe/config/env";
import { cookies } from "next/headers";
export default async function SignupPage() { const locale = (await cookies()).get("locale")?.value === "en" ? "en" : "pt-BR"; return <AuthForm mode="signup" locale={locale} google={getGoogleEnv().enabled} />; }
