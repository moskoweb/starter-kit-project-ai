"use client";
import { useState } from "react";
import { authClient } from "@vibe/auth/client";
import { Button, Input, Label } from "@vibe/ui";

type EnableData = { method: "totp"; totpURI: string; backupCodes: string[] };

export function SecurityForm({ locale = "pt-BR" }: { locale?: "pt-BR" | "en" }) {
  const t = (pt: string, en: string) => locale === "en" ? en : pt;
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [setup, setSetup] = useState<EnableData | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function run(action: () => Promise<{ error?: { message?: string } | null }>) {
    setBusy(true); setMessage("");
    try { const result = await action(); if (result.error) setMessage(t("A operação falhou. Confira senha ou código e tente novamente.", "Operation failed. Check your password or code and try again.")); return !result.error; }
    catch { setMessage(t("A operação falhou. Tente novamente.", "Operation failed. Try again.")); return false; }
    finally { setBusy(false); }
  }
  return <section>
    <h2>{t("Autenticação de dois fatores", "Two-factor authentication")}</h2>
    <Label>{t("Senha", "Password")} <Input type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} /></Label>
    {!setup && !backupCodes ? <Button disabled={busy || !password} onClick={async () => {
      setBusy(true); setMessage("");
      try { const result = await authClient.twoFactor.enable({ password, method: "totp" }); if (result.error) setMessage(t("A operação falhou. Confira sua senha.", "Operation failed. Check your password.")); else if (result.data?.method === "totp") setSetup(result.data); }
      catch { setMessage(t("A operação falhou. Tente novamente.", "Operation failed. Try again.")); }
      finally { setBusy(false); }
    }}>{t("Ativar e gerar segredo TOTP", "Enable and generate TOTP secret")}</Button> : null}
    {setup && <>
      <p>{t("Configure seu autenticador com URI ou segredo. Mantenha esses dados privados.", "Set up your authenticator with the URI or secret. Keep these details private.")}</p>
      <Label>{t("URI TOTP", "TOTP URI")} <textarea readOnly value={setup.totpURI} /></Label>
      <Label>{t("Segredo TOTP", "TOTP secret")} <Input readOnly value={new URL(setup.totpURI).searchParams.get("secret") ?? ""} /></Label>
      <Button onClick={async () => { try { await navigator.clipboard.writeText(setup.totpURI); setMessage(t("URI copiada.", "URI copied.")); } catch { setMessage(t("Não foi possível copiar. Copie a URI manualmente.", "Could not copy. Copy the URI manually.")); } }}>{t("Copiar URI", "Copy URI")}</Button>
      <Label>{t("Código do autenticador", "Authenticator code")} <Input inputMode="numeric" autoComplete="one-time-code" value={code} onChange={e => setCode(e.target.value)} /></Label>
      <Button disabled={busy || !code} onClick={async () => { if (await run(() => authClient.twoFactor.verifyTotp({ code }))) { setBackupCodes(setup.backupCodes); setSetup(null); setCode(""); setMessage(t("Autenticação ativada. Guarde seus códigos de backup agora.", "Authentication enabled. Save your backup codes now.")); } }}>{t("Confirmar código", "Confirm code")}</Button>
    </>}
    {backupCodes && <section aria-live="polite"><h3>{t("Códigos de backup", "Backup codes")}</h3><p>{t("Exibidos uma vez. Guarde-os em local seguro; não serão salvos neste dispositivo.", "Shown once. Keep them somewhere safe; they will not be saved on this device.")}</p><ul>{backupCodes.map((backupCode, index) => <li key={`${index}-${backupCode}`}><code>{backupCode}</code></li>)}</ul><Button onClick={() => setBackupCodes(null)}>{t("Guardei", "Saved")}</Button></section>}
    <hr />
    <Button variant="destructive" disabled={busy || !password} onClick={async () => { if (await run(() => authClient.twoFactor.disable({ password }))) { setSetup(null); setBackupCodes(null); setCode(""); setMessage(t("Autenticação de dois fatores desativada.", "Two-factor authentication disabled.")); } }}>{t("Desativar autenticação de dois fatores", "Disable two-factor authentication")}</Button>
    {message && <p role="alert">{message}</p>}
  </section>;
}
