"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@vibe/auth/client";

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
    <label>{t("Método", "Method")} <select value={method} onChange={e => { const value = e.target.value; if (value === "totp" || value === "emailOTP" || value === "backup") setMethod(value); }}><option value="totp">{t("Aplicativo autenticador", "Authenticator app")}</option><option value="emailOTP">{t("Código por email", "Email code")}</option><option value="backup">{t("Código de backup", "Backup code")}</option></select></label>
    {method === "emailOTP" && <button type="button" disabled={busy} onClick={() => void submit(() => authClient.twoFactor.sendOtp(), false)}>{t("Enviar código por email", "Send email code")}</button>}
    <label>{t("Código", "Code")} <input required autoComplete="one-time-code" value={code} onChange={e => setCode(e.target.value)} /></label>
    <button type="submit" disabled={busy || !code}>{t("Verificar", "Verify")}</button>
    {message && <p role="alert">{message}</p>}
  </form>;
}
