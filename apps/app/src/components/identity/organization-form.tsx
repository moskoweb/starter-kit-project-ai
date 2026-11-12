"use client";

import { useRef, useState, type ReactNode, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { authClient } from "@vibe/auth/client";
import { Button } from "@vibe/ui/components/button";
import { FieldGroup, FieldSet } from "@vibe/ui/components/field";
import { ConfirmAction } from "@vibe/ui/components/resource/confirm-action";
import { Spinner } from "@vibe/ui/components/spinner";
import type { Locale } from "@/lib/i18n";
import { buildPanelPath } from "@/lib/panels/routing";
import { organizationRoles, validOrganizationSlug, type OrganizationRole } from "@/components/organization/shared";

type Action = "create" | "invite" | "cancel" | "resend" | "role" | "remove" | "select" | "accept" | "reject";
const variants: Partial<Record<Action, "destructive" | "outline">> = { remove: "destructive", cancel: "outline", reject: "outline", resend: "outline", select: "outline", role: "outline" };
const text = {
  "pt-BR": {
    confirmations: {
      remove: { title: "Remover membro?", description: "O membro perde acesso imediatamente aos dados desta organização." },
      role: { title: "Alterar função?", description: "As permissões do membro mudam imediatamente." },
      cancel: { title: "Cancelar convite?", description: "O link enviado deixa de funcionar." },
    } as Partial<Record<Action, { title: string; description: string }>>,
    back: "Voltar", invalidRole: "Função inválida.", invalidSlug: "Identificador inválido ou reservado.", done: "Operação concluída.",
    failed: "Não foi possível concluir. Confira os dados e suas permissões e tente novamente.",
  },
  en: {
    confirmations: {
      remove: { title: "Remove member?", description: "The member immediately loses access to this organization's data." },
      role: { title: "Change role?", description: "The member's permissions change immediately." },
      cancel: { title: "Cancel invitation?", description: "The link sent stops working." },
    } as Partial<Record<Action, { title: string; description: string }>>,
    back: "Back", invalidRole: "Invalid role.", invalidSlug: "Invalid or reserved identifier.", done: "Done.",
    failed: "Could not complete. Check the data and your permissions and try again.",
  },
} satisfies Record<Locale, unknown>;

/** Better Auth organization operations; the server enforces membership and role. `create` opens the new organization panel. */
export function OrganizationForm({ action, organizationId, targetId, email, role, children, label, size, locale = "pt-BR" }: { action: Action; organizationId?: string; targetId?: string; email?: string; role?: string; children?: ReactNode; label: string; size?: "sm" | "default"; locale?: Locale }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [busy, setBusy] = useState(false);
  const copy = text[locale];

  async function execute(form: HTMLFormElement) {
    const data = new FormData(form);
    const selectedRole = String(data.get("role") || role || "member");
    if (!organizationRoles.includes(selectedRole as OrganizationRole)) { toast.error(copy.invalidRole); throw new Error("INVALID_ROLE"); }
    const slug = String(data.get("slug") ?? "");
    if (action === "create" && !validOrganizationSlug(slug)) { toast.error(copy.invalidSlug); throw new Error("INVALID_SLUG"); }
    setBusy(true);
    try {
      const result = action === "create" ? await authClient.organization.create({ name: String(data.get("name")).trim(), slug })
        : action === "invite" || action === "resend" ? await authClient.organization.inviteMember({ organizationId, email: email ?? String(data.get("email")), role: selectedRole as OrganizationRole, resend: action === "resend" })
        : action === "cancel" ? await authClient.organization.cancelInvitation({ invitationId: targetId! })
        : action === "role" ? await authClient.organization.updateMemberRole({ organizationId, memberId: targetId!, role: selectedRole as OrganizationRole })
        : action === "remove" ? await authClient.organization.removeMember({ organizationId, memberIdOrEmail: targetId! })
        : action === "select" ? await authClient.organization.setActive({ organizationId })
        : action === "accept" ? await authClient.organization.acceptInvitation({ invitationId: targetId! })
        : await authClient.organization.rejectInvitation({ invitationId: targetId! });
      if (result.error) throw new Error("REQUEST_FAILED");
      form.reset();
      toast.success(copy.done);
      if (action === "create") router.push(buildPanelPath("organization", { tenant: slug }));
      else if (action === "accept" || action === "reject") router.push("/organizations");
      router.refresh();
    } catch (error) {
      toast.error(copy.failed);
      throw error;
    } finally { setBusy(false); }
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!copy.confirmations[action]) void execute(event.currentTarget).catch(() => {});
  }
  const confirmation = copy.confirmations[action];
  const button = <Button type={confirmation ? "button" : "submit"} size={size} variant={variants[action] ?? "default"} disabled={busy}>{busy && <Spinner data-icon="inline-start" />}{label}</Button>;
  return <form ref={formRef} onSubmit={submit} aria-busy={busy}>
    <FieldSet disabled={busy}>
      <FieldGroup className={children ? undefined : "contents"}>
        {children}
        <div>{confirmation ? <ConfirmAction title={confirmation.title} description={confirmation.description} confirmLabel={label} cancelLabel={copy.back} destructive={action !== "role"} trigger={button} onConfirm={() => formRef.current?.reportValidity() ? execute(formRef.current) : Promise.reject(new Error("INVALID_FORM"))} /> : button}</div>
      </FieldGroup>
    </FieldSet>
  </form>;
}
