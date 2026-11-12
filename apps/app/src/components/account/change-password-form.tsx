"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { authClient } from "@vibe/auth/client";
import { Button } from "@vibe/ui/components/button";
import { Checkbox } from "@vibe/ui/components/checkbox";
import { Field, FieldError, FieldGroup, FieldLabel } from "@vibe/ui/components/field";
import { Input } from "@vibe/ui/components/input";
import { Spinner } from "@vibe/ui/components/spinner";

const text = {
  "pt-BR": { current: "Senha atual", next: "Nova senha", confirm: "Confirmar nova senha", revoke: "Encerrar sessões em outros dispositivos", submit: "Alterar senha", short: "A nova senha deve ter pelo menos 8 caracteres.", mismatch: "As senhas não conferem.", done: "Senha alterada.", error: "Não foi possível alterar a senha. Confira a senha atual." },
  en: { current: "Current password", next: "New password", confirm: "Confirm new password", revoke: "Sign out other devices", submit: "Change password", short: "New password needs at least 8 characters.", mismatch: "Passwords do not match.", done: "Password changed.", error: "Could not change password. Check your current password." },
};

export function ChangePasswordForm({ locale = "pt-BR" }: { locale?: "pt-BR" | "en" }) {
  const copy = text[locale];
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [revokeOtherSessions, setRevokeOtherSessions] = useState(true);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (newPassword.length < 8) return setError(copy.short);
    if (newPassword !== confirmation) return setError(copy.mismatch);
    setError(""); setPending(true);
    try {
      const result = await authClient.changePassword({ currentPassword, newPassword, revokeOtherSessions });
      if (result.error) throw new Error();
      setCurrentPassword(""); setNewPassword(""); setConfirmation("");
      toast.success(copy.done); router.refresh();
    } catch { toast.error(copy.error); }
    finally { setPending(false); }
  }
  return <form onSubmit={submit}>
    <FieldGroup>
      <Field>
        <FieldLabel htmlFor="current-password">{copy.current}</FieldLabel>
        <Input id="current-password" type="password" required autoComplete="current-password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} />
      </Field>
      <Field data-invalid={error ? true : undefined}>
        <FieldLabel htmlFor="new-password">{copy.next}</FieldLabel>
        <Input id="new-password" type="password" required minLength={8} autoComplete="new-password" aria-invalid={error ? true : undefined} value={newPassword} onChange={e => setNewPassword(e.target.value)} />
      </Field>
      <Field data-invalid={error ? true : undefined}>
        <FieldLabel htmlFor="confirm-password">{copy.confirm}</FieldLabel>
        <Input id="confirm-password" type="password" required minLength={8} autoComplete="new-password" aria-invalid={error ? true : undefined} value={confirmation} onChange={e => setConfirmation(e.target.value)} />
        {error && <FieldError>{error}</FieldError>}
      </Field>
      <Field orientation="horizontal">
        <Checkbox id="revoke-other-sessions" checked={revokeOtherSessions} onCheckedChange={value => setRevokeOtherSessions(value === true)} />
        <FieldLabel htmlFor="revoke-other-sessions" className="font-normal">{copy.revoke}</FieldLabel>
      </Field>
      <div><Button type="submit" disabled={pending || !currentPassword || !newPassword}>{pending && <Spinner data-icon="inline-start" />}{copy.submit}</Button></div>
    </FieldGroup>
  </form>;
}
