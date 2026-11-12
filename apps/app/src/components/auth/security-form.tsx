"use client";
import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import QRCode from "react-qr-code";
import { toast } from "sonner";
import { authClient } from "@vibe/auth/client";
import { Badge } from "@vibe/ui/components/badge";
import { Button } from "@vibe/ui/components/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@vibe/ui/components/field";
import { Input } from "@vibe/ui/components/input";
import { Spinner } from "@vibe/ui/components/spinner";
import { ConfirmAction } from "@vibe/ui/components/resource/confirm-action";

type Setup = { totpURI: string; backupCodes: string[] };
type Result = { error?: { message?: string } | null };

const text = {
  "pt-BR": {
    enabled: "Ativada", disabled: "Desativada", password: "Senha atual", passwordHelp: "Confirme sua senha para alterar a autenticação em duas etapas.",
    enable: "Ativar", scan: "Escaneie o QR code no seu aplicativo autenticador ou informe o segredo manualmente. Mantenha esses dados privados.",
    secret: "Segredo", copy: "Copiar segredo", copied: "Segredo copiado.", copyError: "Não foi possível copiar.",
    code: "Código do autenticador", verify: "Confirmar código", cancel: "Cancelar",
    activated: "Autenticação em duas etapas ativada. Guarde seus códigos de backup.", deactivated: "Autenticação em duas etapas desativada.",
    backup: "Códigos de backup", backupHelp: "Exibidos uma vez. Guarde-os em local seguro; cada código funciona uma vez.", saved: "Guardei",
    regenerate: "Gerar novos códigos de backup", regenerateTitle: "Gerar novos códigos?", regenerateDescription: "Códigos de backup anteriores deixam de funcionar.", regenerated: "Novos códigos de backup gerados.",
    disable: "Desativar", disableTitle: "Desativar autenticação em duas etapas?", disableDescription: "Sua conta ficará protegida apenas pela senha.",
    error: "A operação falhou. Confira senha ou código e tente novamente.",
  },
  en: {
    enabled: "Enabled", disabled: "Disabled", password: "Current password", passwordHelp: "Confirm your password to change two-factor authentication.",
    enable: "Enable", scan: "Scan the QR code with your authenticator app or enter the secret manually. Keep these details private.",
    secret: "Secret", copy: "Copy secret", copied: "Secret copied.", copyError: "Could not copy.",
    code: "Authenticator code", verify: "Confirm code", cancel: "Cancel",
    activated: "Two-factor authentication enabled. Save your backup codes.", deactivated: "Two-factor authentication disabled.",
    backup: "Backup codes", backupHelp: "Shown once. Keep them somewhere safe; each code works once.", saved: "Saved",
    regenerate: "Generate new backup codes", regenerateTitle: "Generate new codes?", regenerateDescription: "Previous backup codes stop working.", regenerated: "New backup codes generated.",
    disable: "Disable", disableTitle: "Disable two-factor authentication?", disableDescription: "Your account will be protected by password only.",
    error: "Operation failed. Check your password or code and try again.",
  },
};

/** Two-factor lifecycle via Better Auth twoFactor plugin: enable, verify TOTP, backup codes, disable. */
export function SecurityForm({ enabled, locale = "pt-BR" }: { enabled: boolean; locale?: "pt-BR" | "en" }) {
  const copy = text[locale];
  const id = useId();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [setup, setSetup] = useState<Setup | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);
  const secret = setup ? new URL(setup.totpURI).searchParams.get("secret") ?? "" : "";

  async function run<T extends Result>(action: () => Promise<T>): Promise<T | null> {
    setBusy(true);
    try { const result = await action(); if (result.error) { toast.error(copy.error); return null; } return result; }
    catch { toast.error(copy.error); return null; }
    finally { setBusy(false); }
  }
  async function enable() {
    const result = await run(() => authClient.twoFactor.enable({ password, method: "totp" }));
    if (result?.data?.method === "totp") setSetup({ totpURI: result.data.totpURI, backupCodes: result.data.backupCodes });
  }
  async function verify() {
    if (!setup || !await run(() => authClient.twoFactor.verifyTotp({ code }))) return;
    setBackupCodes(setup.backupCodes); setSetup(null); setCode(""); setPassword("");
    toast.success(copy.activated); router.refresh();
  }
  async function regenerate() {
    const result = await run(() => authClient.twoFactor.generateBackupCodes({ password }));
    if (!result?.data) throw new Error("REGENERATE_FAILED");
    setBackupCodes(result.data.backupCodes); setPassword(""); toast.success(copy.regenerated);
  }
  async function disable() {
    if (!await run(() => authClient.twoFactor.disable({ password }))) throw new Error("DISABLE_FAILED");
    setBackupCodes(null); setPassword(""); toast.success(copy.deactivated); router.refresh();
  }

  return <div className="flex flex-col gap-6">
    <div><Badge variant={enabled ? "default" : "secondary"}>{enabled ? copy.enabled : copy.disabled}</Badge></div>
    {backupCodes && <section aria-live="polite" className="flex flex-col gap-3 rounded-lg border p-4">
      <h3 className="font-medium">{copy.backup}</h3>
      <p className="text-sm text-muted-foreground">{copy.backupHelp}</p>
      <ul className="grid grid-cols-2 gap-2 font-mono text-sm">{backupCodes.map((backupCode, index) => <li key={`${index}-${backupCode}`}><code>{backupCode}</code></li>)}</ul>
      <div><Button type="button" variant="outline" onClick={() => setBackupCodes(null)}>{copy.saved}</Button></div>
    </section>}
    {setup ? <FieldGroup>
      <FieldDescription>{copy.scan}</FieldDescription>
      <div className="w-fit rounded-lg bg-white p-3"><QRCode value={setup.totpURI} size={160} /></div>
      <Field>
        <FieldLabel htmlFor={`${id}-secret`}>{copy.secret}</FieldLabel>
        <div className="flex gap-2">
          <Input id={`${id}-secret`} readOnly className="font-mono" value={secret} />
          <Button type="button" variant="outline" onClick={async () => { try { await navigator.clipboard.writeText(secret); toast.success(copy.copied); } catch { toast.error(copy.copyError); } }}>{copy.copy}</Button>
        </div>
      </Field>
      <Field>
        <FieldLabel htmlFor={`${id}-code`}>{copy.code}</FieldLabel>
        <Input id={`${id}-code`} inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={e => setCode(e.target.value.trim())} />
      </Field>
      <div className="flex gap-2">
        <Button type="button" disabled={busy || code.length !== 6} onClick={() => void verify()}>{busy && <Spinner data-icon="inline-start" />}{copy.verify}</Button>
        <Button type="button" variant="ghost" disabled={busy} onClick={() => { setSetup(null); setCode(""); }}>{copy.cancel}</Button>
      </div>
    </FieldGroup> : <FieldGroup>
      <Field>
        <FieldLabel htmlFor={`${id}-password`}>{copy.password}</FieldLabel>
        <Input id={`${id}-password`} type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} />
        <FieldDescription>{copy.passwordHelp}</FieldDescription>
      </Field>
      <div className="flex flex-wrap gap-2">
        {enabled ? <>
          <ConfirmAction trigger={<Button type="button" variant="outline" disabled={busy || !password}>{copy.regenerate}</Button>} title={copy.regenerateTitle} description={copy.regenerateDescription} confirmLabel={copy.regenerate} cancelLabel={copy.cancel} onConfirm={regenerate} />
          <ConfirmAction destructive trigger={<Button type="button" variant="destructive" disabled={busy || !password}>{copy.disable}</Button>} title={copy.disableTitle} description={copy.disableDescription} confirmLabel={copy.disable} cancelLabel={copy.cancel} onConfirm={disable} />
        </> : <Button type="button" disabled={busy || !password} onClick={() => void enable()}>{busy && <Spinner data-icon="inline-start" />}{copy.enable}</Button>}
      </div>
    </FieldGroup>}
  </div>;
}
