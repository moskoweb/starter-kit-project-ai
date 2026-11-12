"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { authClient } from "@vibe/auth/client";
import { Button } from "@vibe/ui/components/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@vibe/ui/components/field";
import { Input } from "@vibe/ui/components/input";
import { Spinner } from "@vibe/ui/components/spinner";

const text = {
  "pt-BR": { name: "Nome", save: "Salvar", saved: "Perfil atualizado.", invalid: "Informe um nome com até 100 caracteres.", error: "Não foi possível salvar o perfil." },
  en: { name: "Name", save: "Save", saved: "Profile updated.", invalid: "Enter a name up to 100 characters.", error: "Could not save profile." },
};

export function ProfileForm({ name: initialName, locale = "pt-BR" }: { name: string; locale?: "pt-BR" | "en" }) {
  const copy = text[locale];
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = name.trim();
    if (!value || value.length > 100) return setError(copy.invalid);
    setError(""); setPending(true);
    try {
      const result = await authClient.updateUser({ name: value });
      if (result.error) throw new Error();
      toast.success(copy.saved); router.refresh();
    } catch { toast.error(copy.error); }
    finally { setPending(false); }
  }
  return <form onSubmit={submit}>
    <FieldGroup>
      <Field data-invalid={error ? true : undefined}>
        <FieldLabel htmlFor="profile-name">{copy.name}</FieldLabel>
        <Input id="profile-name" required maxLength={100} autoComplete="name" aria-invalid={error ? true : undefined} value={name} onChange={event => setName(event.target.value)} />
        {error && <FieldError>{error}</FieldError>}
      </Field>
      <div><Button type="submit" disabled={pending || name.trim() === initialName}>{pending && <Spinner data-icon="inline-start" />}{copy.save}</Button></div>
    </FieldGroup>
  </form>;
}
