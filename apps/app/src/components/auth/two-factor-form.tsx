"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@vibe/auth/client";
import { Button } from "@vibe/ui/components/button";
import { Field, FieldGroup, FieldLabel } from "@vibe/ui/components/field";
import { Input } from "@vibe/ui/components/input";
import { NativeSelect, NativeSelectOption } from "@vibe/ui/components/native-select";

export function TwoFactorForm({ locale = "pt-BR" }: { locale?: "pt-BR" | "en" }) {
  const t = (pt: string, en: string) => locale === "en" ? en : pt;
  const router = useRouter();
  const [method, setMethod] = useState<"totp" | "emailOTP" | "backup">("totp");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(action: () => Promise<{ error?: { message?: string } | null }>, verify = true) {
    setBusy(true); setMessage("");
    try {
      const result = await action();
      if (result.error) setMessage(t("Não foi possível concluir. Confira o código e tente novamente.", "Could not complete this request. Check your code and try again."));
      else if (verify) { router.push("/"); router.refresh(); }
      else setMessage(t("Código enviado por email.", "Code sent by email."));
    }
    catch { setMessage(t("Não foi possível concluir. Tente novamente.", "Could not complete this request. Try again.")); }
    finally { setBusy(false); }
  }
  return <form onSubmit={e => { e.preventDefault(); void submit(() => method === "totp" ? authClient.twoFactor.verifyTotp({ code }) : method === "backup" ? authClient.twoFactor.verifyBackupCode({ code }) : authClient.twoFactor.verifyOtp({ code })); }}>
    <FieldGroup>
      <Field><FieldLabel htmlFor="two-factor-method">{t("Método", "Method")}</FieldLabel><NativeSelect id="two-factor-method" className="w-full" value={method} onChange={e => { const value = e.target.value; if (value === "totp" || value === "emailOTP" || value === "backup") setMethod(value); }}><NativeSelectOption value="totp">{t("Aplicativo autenticador", "Authenticator app")}</NativeSelectOption><NativeSelectOption value="emailOTP">{t("Código por email", "Email code")}</NativeSelectOption><NativeSelectOption value="backup">{t("Código de backup", "Backup code")}</NativeSelectOption></NativeSelect></Field>
      {method === "emailOTP" && <Button type="button" variant="outline" disabled={busy} onClick={() => void submit(() => authClient.twoFactor.sendOtp(), false)}>{t("Enviar código por email", "Send email code")}</Button>}
      <Field><FieldLabel htmlFor="two-factor-code">{t("Código", "Code")}</FieldLabel><Input id="two-factor-code" required autoComplete="one-time-code" value={code} onChange={e => setCode(e.target.value)} /></Field>
      {message && <p role="alert" className="text-sm text-muted-foreground">{message}</p>}
      <Button type="submit" disabled={busy || !code}>{t("Verificar", "Verify")}</Button>
    </FieldGroup>
  </form>;
}
