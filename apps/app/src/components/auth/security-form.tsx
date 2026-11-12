"use client";
import { useId, useState } from "react";
import { authClient } from "@vibe/auth/client";
import { Button } from "@vibe/ui/components/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@vibe/ui/components/field";
import { Input } from "@vibe/ui/components/input";
import { Separator } from "@vibe/ui/components/separator";
import { Textarea } from "@vibe/ui/components/textarea";

type EnableData = { method: "totp"; totpURI: string; backupCodes: string[] };

export function SecurityForm({ locale = "pt-BR" }: { locale?: "pt-BR" | "en" }) {
  const t = (pt: string, en: string) => locale === "en" ? en : pt;
  const id = useId();
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
  return <section className="flex flex-col gap-6">
    <h2 className="text-lg font-semibold">{t("Autenticação de dois fatores", "Two-factor authentication")}</h2>
    <FieldGroup>
      <Field>
        <FieldLabel htmlFor={`${id}-password`}>{t("Senha", "Password")}</FieldLabel>
        <Input id={`${id}-password`} type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} />
      </Field>
      {!setup && !backupCodes ? <div><Button type="button" disabled={busy || !password} onClick={async () => {
        setBusy(true); setMessage("");
        try { const result = await authClient.twoFactor.enable({ password, method: "totp" }); if (result.error) setMessage(t("A operação falhou. Confira sua senha.", "Operation failed. Check your password.")); else if (result.data?.method === "totp") setSetup(result.data); }
        catch { setMessage(t("A operação falhou. Tente novamente.", "Operation failed. Try again.")); }
        finally { setBusy(false); }
      }}>{t("Ativar e gerar segredo TOTP", "Enable and generate TOTP secret")}</Button></div> : null}
      {setup && <>
        <FieldDescription>{t("Configure seu autenticador com URI ou segredo. Mantenha esses dados privados.", "Set up your authenticator with the URI or secret. Keep these details private.")}</FieldDescription>
        <Field>
          <FieldLabel htmlFor={`${id}-uri`}>{t("URI TOTP", "TOTP URI")}</FieldLabel>
          <Textarea id={`${id}-uri`} readOnly value={setup.totpURI} />
        </Field>
        <Field>
          <FieldLabel htmlFor={`${id}-secret`}>{t("Segredo TOTP", "TOTP secret")}</FieldLabel>
          <Input id={`${id}-secret`} readOnly value={new URL(setup.totpURI).searchParams.get("secret") ?? ""} />
        </Field>
        <div><Button type="button" variant="outline" onClick={async () => { try { await navigator.clipboard.writeText(setup.totpURI); setMessage(t("URI copiada.", "URI copied.")); } catch { setMessage(t("Não foi possível copiar. Copie a URI manualmente.", "Could not copy. Copy the URI manually.")); } }}>{t("Copiar URI", "Copy URI")}</Button></div>
        <Field>
          <FieldLabel htmlFor={`${id}-code`}>{t("Código do autenticador", "Authenticator code")}</FieldLabel>
          <Input id={`${id}-code`} inputMode="numeric" autoComplete="one-time-code" value={code} onChange={e => setCode(e.target.value)} />
        </Field>
        <div><Button type="button" disabled={busy || !code} onClick={async () => { if (await run(() => authClient.twoFactor.verifyTotp({ code }))) { setBackupCodes(setup.backupCodes); setSetup(null); setCode(""); setMessage(t("Autenticação ativada. Guarde seus códigos de backup agora.", "Authentication enabled. Save your backup codes now.")); } }}>{t("Confirmar código", "Confirm code")}</Button></div>
      </>}
    </FieldGroup>
    {backupCodes && <section aria-live="polite" className="flex flex-col gap-3"><h3 className="font-medium">{t("Códigos de backup", "Backup codes")}</h3><p className="text-sm text-muted-foreground">{t("Exibidos uma vez. Guarde-os em local seguro; não serão salvos neste dispositivo.", "Shown once. Keep them somewhere safe; they will not be saved on this device.")}</p><ul className="grid grid-cols-2 gap-2 font-mono text-sm">{backupCodes.map((backupCode, index) => <li key={`${index}-${backupCode}`}><code>{backupCode}</code></li>)}</ul><div><Button type="button" variant="outline" onClick={() => setBackupCodes(null)}>{t("Guardei", "Saved")}</Button></div></section>}
    <Separator />
    <div><Button type="button" variant="destructive" disabled={busy || !password} onClick={async () => { if (await run(() => authClient.twoFactor.disable({ password }))) { setSetup(null); setBackupCodes(null); setCode(""); setMessage(t("Autenticação de dois fatores desativada.", "Two-factor authentication disabled.")); } }}>{t("Desativar autenticação de dois fatores", "Disable two-factor authentication")}</Button></div>
    {message && <p role="alert" className="text-sm">{message}</p>}
  </section>;
}
