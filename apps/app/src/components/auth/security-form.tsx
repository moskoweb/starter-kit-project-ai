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
    <h2>Autenticação de dois fatores</h2>
    <Label>Senha <Input type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} /></Label>
    {!setup && !backupCodes ? <Button disabled={busy || !password} onClick={async () => {
      setBusy(true); setMessage("");
      try { const result = await authClient.twoFactor.enable({ password, method: "totp" }); if (result.error) setMessage(t("A operação falhou. Confira sua senha.", "Operation failed. Check your password.")); else if (result.data?.method === "totp") setSetup(result.data); }
      catch { setMessage(t("A operação falhou. Tente novamente.", "Operation failed. Try again.")); }
      finally { setBusy(false); }
    }}>Ativar e gerar segredo TOTP</Button> : null}
    {setup && <>
      <p>Configure seu autenticador com URI ou segredo. Mantenha esses dados privados.</p>
      <Label>URI TOTP <textarea readOnly value={setup.totpURI} /></Label>
      <Label>Segredo TOTP <Input readOnly value={new URL(setup.totpURI).searchParams.get("secret") ?? ""} /></Label>
      <Button onClick={async () => { try { await navigator.clipboard.writeText(setup.totpURI); setMessage("URI copiada."); } catch { setMessage("Não foi possível copiar. Copie a URI manualmente."); } }}>Copiar URI</Button>
      <Label>Código do autenticador <Input inputMode="numeric" autoComplete="one-time-code" value={code} onChange={e => setCode(e.target.value)} /></Label>
      <Button disabled={busy || !code} onClick={async () => { if (await run(() => authClient.twoFactor.verifyTotp({ code }))) { setBackupCodes(setup.backupCodes); setSetup(null); setCode(""); setMessage("Autenticação ativada. Guarde seus códigos de backup agora."); } }}>Confirmar código</Button>
    </>}
    {backupCodes && <section aria-live="polite"><h3>Códigos de backup</h3><p>Exibidos uma vez. Guarde-os em local seguro; não serão salvos neste dispositivo.</p><ul>{backupCodes.map((backupCode, index) => <li key={`${index}-${backupCode}`}><code>{backupCode}</code></li>)}</ul><Button onClick={() => setBackupCodes(null)}>Guardei</Button></section>}
    <hr />
    <Button variant="destructive" disabled={busy || !password} onClick={() => void run(() => authClient.twoFactor.disable({ password }))}>Desativar autenticação de dois fatores</Button>
    {message && <p role="alert">{message}</p>}
  </section>;
}
