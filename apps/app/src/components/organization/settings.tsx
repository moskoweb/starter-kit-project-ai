"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { authClient } from "@vibe/auth/client";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@vibe/ui/components/alert-dialog";
import { Button } from "@vibe/ui/components/button";
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldSet } from "@vibe/ui/components/field";
import { Input } from "@vibe/ui/components/input";
import { ConfirmAction } from "@vibe/ui/components/resource/confirm-action";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@vibe/ui/components/select";
import { Spinner } from "@vibe/ui/components/spinner";
import type { Locale } from "@/lib/i18n";
import { slugPattern, validOrganizationSlug } from "./shared";

const text = {
  "pt-BR": {
    name: "Nome", slug: "Identificador na URL", slugHelp: "Letras minúsculas, números e hífens. Alterar quebra links antigos para o painel.", save: "Salvar alterações",
    saved: "Organização atualizada.", invalidSlug: "Identificador inválido ou reservado.", failed: "Não foi possível concluir. Confira os dados e suas permissões e tente novamente.",
    newOwner: "Novo proprietário", choose: "Selecione um membro", transfer: "Transferir propriedade", transferTitle: "Transferir propriedade?",
    transferDescription: "O membro escolhido vira proprietário e sua função passa a Administrador. Somente o novo proprietário poderá desfazer.", transferred: "Propriedade transferida.",
    back: "Voltar", leave: "Sair da organização", leaveTitle: "Sair da organização?", leaveDescription: "Você perde acesso imediatamente. Para voltar, será preciso um novo convite.", left: "Você saiu da organização.",
    remove: "Excluir organização", removeTitle: "Excluir organização?", removeDescription: (slug: string) => `Todos os dados, membros e convites serão excluídos permanentemente. Digite ${slug} para confirmar.`, confirmSlug: "Identificador da organização", removed: "Organização excluída.",
  },
  en: {
    name: "Name", slug: "URL identifier", slugHelp: "Lowercase letters, numbers and hyphens. Changing it breaks old panel links.", save: "Save changes",
    saved: "Organization updated.", invalidSlug: "Invalid or reserved identifier.", failed: "Could not complete. Check the data and your permissions and try again.",
    newOwner: "New owner", choose: "Select a member", transfer: "Transfer ownership", transferTitle: "Transfer ownership?",
    transferDescription: "The chosen member becomes owner and your role becomes Admin. Only the new owner can undo this.", transferred: "Ownership transferred.",
    back: "Back", leave: "Leave organization", leaveTitle: "Leave organization?", leaveDescription: "You lose access immediately. Rejoining requires a new invitation.", left: "You left the organization.",
    remove: "Delete organization", removeTitle: "Delete organization?", removeDescription: (slug: string) => `All data, members and invitations will be permanently deleted. Type ${slug} to confirm.`, confirmSlug: "Organization identifier", removed: "Organization deleted.",
  },
} satisfies Record<Locale, unknown>;

function fail(message: string): never { toast.error(message); throw new Error("REQUEST_FAILED"); }

/** Edit name and slug via `organization.update`; the auth hook re-validates the slug server-side. */
export function OrganizationGeneralForm({ organizationId, name, slug, locale }: { organizationId: string; name: string; slug: string; locale: Locale }) {
  const copy = text[locale];
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const nextName = String(data.get("name") ?? "").trim();
    const nextSlug = String(data.get("slug") ?? "");
    if (!validOrganizationSlug(nextSlug)) { toast.error(copy.invalidSlug); return; }
    setBusy(true);
    try {
      const result = await authClient.organization.update({ organizationId, data: { name: nextName, slug: nextSlug } });
      if (result.error) { toast.error(result.error.message || copy.failed); return; }
      toast.success(copy.saved);
      if (nextSlug !== slug) router.replace(`/organizations/${encodeURIComponent(nextSlug)}`);
      router.refresh();
    } finally { setBusy(false); }
  }
  return <form onSubmit={submit} aria-busy={busy}>
    <FieldSet disabled={busy}>
      <FieldGroup>
        <Field><FieldLabel htmlFor="organization-name">{copy.name}</FieldLabel><Input id="organization-name" name="name" defaultValue={name} minLength={1} maxLength={100} required /></Field>
        <Field><FieldLabel htmlFor="organization-slug">{copy.slug}</FieldLabel><Input id="organization-slug" name="slug" defaultValue={slug} pattern={slugPattern} maxLength={80} required /><FieldDescription>{copy.slugHelp}</FieldDescription></Field>
        <div><Button type="submit" disabled={busy}>{busy && <Spinner data-icon="inline-start" />}{copy.save}</Button></div>
      </FieldGroup>
    </FieldSet>
  </form>;
}

/** Owner promotes a member to owner, then demotes self to admin (Better Auth requires an owner to remain). */
export function TransferOwnership({ organizationId, selfMemberId, members, locale }: { organizationId: string; selfMemberId: string; members: Array<{ id: string; label: string }>; locale: Locale }) {
  const copy = text[locale];
  const router = useRouter();
  const [target, setTarget] = useState<string | null>(null);
  const items = [{ value: null, label: copy.choose }, ...members.map(member => ({ value: member.id, label: member.label }))];
  async function transfer() {
    if (!target) fail(copy.choose);
    const promoted = await authClient.organization.updateMemberRole({ organizationId, memberId: target, role: "owner" });
    if (promoted.error) fail(promoted.error.message || copy.failed);
    const demoted = await authClient.organization.updateMemberRole({ organizationId, memberId: selfMemberId, role: "admin" });
    if (demoted.error) { router.refresh(); fail(demoted.error.message || copy.failed); }
    toast.success(copy.transferred);
    router.refresh();
  }
  return <FieldGroup>
    <Field>
      <FieldLabel htmlFor="transfer-owner">{copy.newOwner}</FieldLabel>
      <Select items={items} value={target} onValueChange={value => setTarget(value as string | null)}>
        <SelectTrigger id="transfer-owner" className="w-full md:w-80"><SelectValue /></SelectTrigger>
        <SelectContent><SelectGroup>{members.map(member => <SelectItem key={member.id} value={member.id}>{member.label}</SelectItem>)}</SelectGroup></SelectContent>
      </Select>
    </Field>
    <div><ConfirmAction title={copy.transferTitle} description={copy.transferDescription} confirmLabel={copy.transfer} cancelLabel={copy.back} destructive onConfirm={transfer}
      trigger={<Button variant="outline" disabled={!target}>{copy.transfer}</Button>} /></div>
  </FieldGroup>;
}

/** Leave via `organization.leave`; Better Auth rejects the last owner too. */
export function LeaveOrganization({ organizationId, locale }: { organizationId: string; locale: Locale }) {
  const copy = text[locale];
  const router = useRouter();
  async function leave() {
    const result = await authClient.organization.leave({ organizationId });
    if (result.error) fail(result.error.message || copy.failed);
    toast.success(copy.left);
    router.push("/");
    router.refresh();
  }
  return <ConfirmAction title={copy.leaveTitle} description={copy.leaveDescription} confirmLabel={copy.leave} cancelLabel={copy.back} destructive onConfirm={leave}
    trigger={<Button variant="outline">{copy.leave}</Button>} />;
}

/** Owner-only delete via `organization.delete`, confirmed by typing the slug. */
export function DeleteOrganization({ organizationId, slug, locale }: { organizationId: string; slug: string; locale: Locale }) {
  const copy = text[locale];
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [pending, setPending] = useState(false);
  async function remove() {
    setPending(true);
    try {
      const result = await authClient.organization.delete({ organizationId });
      if (result.error) { toast.error(result.error.message || copy.failed); return; }
      setOpen(false);
      toast.success(copy.removed);
      router.push("/");
      router.refresh();
    } finally { setPending(false); }
  }
  return <AlertDialog open={open} onOpenChange={value => { if (!pending) { setOpen(value); setTyped(""); } }}>
    <AlertDialogTrigger render={<Button variant="destructive" />}>{copy.remove}</AlertDialogTrigger>
    <AlertDialogContent>
      <AlertDialogHeader><AlertDialogTitle>{copy.removeTitle}</AlertDialogTitle><AlertDialogDescription>{copy.removeDescription(slug)}</AlertDialogDescription></AlertDialogHeader>
      <Field><FieldLabel htmlFor="delete-confirm" className="sr-only">{copy.confirmSlug}</FieldLabel><Input id="delete-confirm" value={typed} onChange={event => setTyped(event.target.value)} placeholder={slug} autoComplete="off" disabled={pending} /></Field>
      <AlertDialogFooter>
        <AlertDialogCancel disabled={pending}>{copy.back}</AlertDialogCancel>
        <Button variant="destructive" disabled={pending || typed !== slug} onClick={() => void remove()}>{pending && <Spinner data-icon="inline-start" />}{copy.remove}</Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>;
}
