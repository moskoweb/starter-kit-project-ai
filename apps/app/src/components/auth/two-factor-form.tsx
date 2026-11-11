"use client";
import { useState } from "react";
import { authClient } from "@vibe/auth/client";

export function TwoFactorForm() {
  const [method, setMethod] = useState<"totp" | "emailOTP" | "backup">("totp");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(action: () => Promise<{ error?: { message?: string } | null }>) {
    setBusy(true); setMessage("");
    try { const result = await action(); setMessage(result.error?.message ?? (result.error ? "Falha na verificação." : "Código verificado.")); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Falha na verificação."); }
    finally { setBusy(false); }
  }
  return <form onSubmit={e => { e.preventDefault(); void submit(() => method === "totp" ? authClient.twoFactor.verifyTotp({ code }) : method === "backup" ? authClient.twoFactor.verifyBackupCode({ code }) : authClient.twoFactor.verifyOtp({ code })); }}>
    <label>Método <select value={method} onChange={e => { const value = e.target.value; if (value === "totp" || value === "emailOTP" || value === "backup") setMethod(value); }}><option value="totp">Aplicativo autenticador</option><option value="emailOTP">Código por email</option><option value="backup">Código de backup</option></select></label>
    {method === "emailOTP" && <button type="button" disabled={busy} onClick={() => void submit(() => authClient.twoFactor.sendOtp())}>Enviar código por email</button>}
    <label>Código <input required autoComplete="one-time-code" value={code} onChange={e => setCode(e.target.value)} /></label>
    <button disabled={busy || !code}>Verificar</button>
    {message && <p role="alert">{message}</p>}
  </form>;
}
