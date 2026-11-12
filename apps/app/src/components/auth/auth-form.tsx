"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@vibe/auth/client";
import { Button } from "@vibe/ui/components/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@vibe/ui/components/field";
import { Input } from "@vibe/ui/components/input";
import { AuthLayout } from "./auth-layout";
type Mode = "login" | "signup" | "forgot" | "reset" | "verify";
export function AuthForm({ mode, token, locale = "pt-BR" }: { mode: Mode; token?: string; locale?: "pt-BR" | "en" }) {
  const en = locale === "en";
  const router = useRouter();
  const [email, setEmail] = useState(""); const [name, setName] = useState(""); const [password, setPassword] = useState("");
  const [error, setError] = useState(""); const [notice, setNotice] = useState(""); const [pending, setPending] = useState(false);
  const titles: Record<Mode, string> = en ? { login: "Sign in", signup: "Create account", forgot: "Forgot password", reset: "Reset password", verify: "Verify email" } : { login: "Entrar", signup: "Criar conta", forgot: "Esqueci minha senha", reset: "Redefinir senha", verify: "Verificar email" };
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setNotice("");
    if (mode !== "reset" && !/^\S+@\S+\.\S+$/.test(email)) return setError(en ? "Enter a valid email." : "Informe um email válido.");
    if (["login", "signup", "reset"].includes(mode) && password.length < 8) return setError(en ? "Password needs at least 8 characters." : "A senha deve ter pelo menos 8 caracteres.");
    if (mode === "signup" && !name.trim()) return setError(en ? "Enter your name." : "Informe seu nome.");
    if (mode === "reset" && !token) return setError(en ? "Invalid reset link." : "Link de redefinição inválido.");
    setPending(true);
    try {
      if (mode === "login") {
        const result = await authClient.signIn.email({ email, password, callbackURL: "/" });
        if (result.error) throw new Error();
        router.push(result.data && "twoFactorRedirect" in result.data && result.data.twoFactorRedirect ? "/two-factor" : "/");
      } else if (mode === "signup") {
        const result = await authClient.signUp.email({ email, password, name: name.trim(), callbackURL: "/verify-email" });
        if (result.error) throw new Error();
        setNotice(en ? "Account created. Verify your email before signing in." : "Conta criada. Verifique seu email antes de entrar.");
      } else if (mode === "forgot") {
        const result = await authClient.requestPasswordReset({ email, redirectTo: "/reset-password" });
        if (result.error) throw new Error();
        setNotice(en ? "If an account exists, a reset link will arrive by email." : "Se existir conta, você receberá um link por email.");
      } else if (mode === "reset") {
        const result = await authClient.resetPassword({ newPassword: password, token: token! });
        if (result.error) throw new Error();
        setNotice(en ? "Password reset. You can sign in." : "Senha redefinida. Você já pode entrar.");
      } else {
        const result = await authClient.sendVerificationEmail({ email, callbackURL: "/verify-email" });
        if (result.error) throw new Error();
        setNotice(en ? "Check your inbox for verification." : "Confira sua caixa de entrada para verificar email.");
      }
    } catch { setError(en ? "Could not complete this request. Check your details and try again." : "Não foi possível concluir. Confira os dados e tente novamente."); }
    finally { setPending(false); }
  }
  const descriptions: Record<Mode, string> = en ? { login: "Enter your email and password.", signup: "Create your account with email and password.", forgot: "We will email you a reset link.", reset: "Choose a new password.", verify: "After verification, sign in. You can request another email below." } : { login: "Informe seu email e senha.", signup: "Crie sua conta com email e senha.", forgot: "Enviaremos um link de redefinição por email.", reset: "Escolha uma nova senha.", verify: "Após confirmar email, entre. Você pode reenviar email abaixo." };
  return <AuthLayout title={titles[mode]} description={descriptions[mode]}>
    <form onSubmit={submit}>
      <FieldGroup>
        {mode === "signup" && <Field><FieldLabel htmlFor="auth-name">{en ? "Name" : "Nome"}</FieldLabel><Input id="auth-name" required autoComplete="name" value={name} onChange={event => setName(event.target.value)} /></Field>}
        {mode !== "reset" && <Field><FieldLabel htmlFor="auth-email">Email</FieldLabel><Input id="auth-email" required type="email" autoComplete="email" placeholder="m@example.com" value={email} onChange={event => setEmail(event.target.value)} /></Field>}
        {["login", "signup", "reset"].includes(mode) && <Field>
          <div className="flex items-center"><FieldLabel htmlFor="auth-password">{en ? "Password" : "Senha"}</FieldLabel>{mode === "login" && <a href="/forgot-password" className="ml-auto text-sm underline-offset-4 hover:underline">{titles.forgot}</a>}</div>
          <Input id="auth-password" required type="password" minLength={8} autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={event => setPassword(event.target.value)} />
        </Field>}
        {error && <FieldError>{error}</FieldError>}
        {notice && <p role="status" className="text-sm text-muted-foreground">{notice}</p>}
        <Field>
          <Button type="submit" disabled={pending}>{pending ? en ? "Please wait…" : "Aguarde…" : titles[mode]}</Button>
          <FieldDescription className="text-center">{mode === "login" ? <><a href="/signup">{titles.signup}</a> · <a href="/verify-email">{titles.verify}</a></> : <a href="/login">{titles.login}</a>}</FieldDescription>
        </Field>
      </FieldGroup>
    </form>
  </AuthLayout>;
}
