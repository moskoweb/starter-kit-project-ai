"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@vibe/auth/client";
import { Button, Card, Heading, Input, Label, Text } from "@vibe/ui";
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
  return <main className="grid min-h-screen place-items-center p-8"><Card className="w-full max-w-md"><Heading>{titles[mode]}</Heading>{mode === "verify" && <Text muted>{en ? "After verification, sign in. You can request another email below." : "Após confirmar email, entre. Você pode reenviar email abaixo."}</Text>}<form onSubmit={submit} className="grid gap-4">{mode === "signup" && <Label>{en ? "Name" : "Nome"}<Input required autoComplete="name" value={name} onChange={event => setName(event.target.value)} /></Label>}{mode !== "reset" && <Label>Email<Input required type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} /></Label>}{["login", "signup", "reset"].includes(mode) && <Label>{en ? "Password" : "Senha"}<Input required type="password" minLength={8} autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={event => setPassword(event.target.value)} /></Label>}<Button type="submit" disabled={pending}>{pending ? en ? "Please wait…" : "Aguarde…" : titles[mode]}</Button>{error && <p role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}</form><nav className="mt-4 grid gap-2">{mode === "login" ? <><a href="/signup">{titles.signup}</a><a href="/forgot-password">{titles.forgot}</a><a href="/verify-email">{titles.verify}</a></> : <a href="/login">{titles.login}</a>}</nav></Card></main>;
}
