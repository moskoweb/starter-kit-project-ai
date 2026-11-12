"use client";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { authClient } from "@vibe/auth/client";
import { Button } from "@vibe/ui/components/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@vibe/ui/components/field";
import { Input } from "@vibe/ui/components/input";
import { Spinner } from "@vibe/ui/components/spinner";

const text = {
  "pt-BR": { current: "Email atual", next: "Novo email", submit: "Solicitar troca", invalid: "Informe um email válido e diferente do atual.", sent: "Confira sua caixa de entrada para confirmar a troca.", error: "Não foi possível solicitar a troca de email.", help: "Enviaremos uma confirmação ao email atual e depois uma verificação ao novo endereço. O email só muda após as confirmações." },
  en: { current: "Current email", next: "New email", submit: "Request change", invalid: "Enter a valid email different from the current one.", sent: "Check your inbox to confirm the change.", error: "Could not request email change.", help: "We email a confirmation to your current address, then a verification to the new one. The email changes only after confirmation." },
};

export function ChangeEmailForm({ email, locale = "pt-BR" }: { email: string; locale?: "pt-BR" | "en" }) {
  const copy = text[locale];
  const [newEmail, setNewEmail] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = newEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) || value === email.toLowerCase()) return setError(copy.invalid);
    setError(""); setPending(true);
    try {
      const result = await authClient.changeEmail({ newEmail: value, callbackURL: "/account" });
      if (result.error) throw new Error();
      toast.success(copy.sent); setNewEmail("");
    } catch { toast.error(copy.error); }
    finally { setPending(false); }
  }
  return <form onSubmit={submit}>
    <FieldGroup>
      <Field>
        <FieldLabel htmlFor="current-email">{copy.current}</FieldLabel>
        <Input id="current-email" type="email" readOnly value={email} />
      </Field>
      <Field data-invalid={error ? true : undefined}>
        <FieldLabel htmlFor="new-email">{copy.next}</FieldLabel>
        <Input id="new-email" type="email" required autoComplete="email" aria-invalid={error ? true : undefined} value={newEmail} onChange={event => setNewEmail(event.target.value)} />
        <FieldDescription>{copy.help}</FieldDescription>
        {error && <FieldError>{error}</FieldError>}
      </Field>
      <div><Button type="submit" disabled={pending || !newEmail}>{pending && <Spinner data-icon="inline-start" />}{copy.submit}</Button></div>
    </FieldGroup>
  </form>;
}
