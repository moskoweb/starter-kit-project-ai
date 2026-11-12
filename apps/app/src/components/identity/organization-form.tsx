"use client";
import { useState, type ReactNode, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@vibe/auth/client";
import { Button } from "@vibe/ui/components/button";
import { FieldGroup, FieldSet } from "@vibe/ui/components/field";
type Action = "create" | "invite" | "cancel" | "resend" | "role" | "remove" | "select" | "accept" | "reject";
const variants: Partial<Record<Action, "destructive" | "outline">> = { remove: "destructive", cancel: "outline", reject: "outline", resend: "outline", select: "outline", role: "outline" };
export function OrganizationForm({ action, organizationId, targetId, email, role, children, label }: { action: Action; organizationId?: string; targetId?: string; email?: string; role?: string; children?: ReactNode; label: string }) {
  const router = useRouter(); const [busy, setBusy] = useState(false); const [message, setMessage] = useState(""); const [failed, setFailed] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget; const data = new FormData(form);
    if ((action === "remove" || action === "role") && !window.confirm(action === "remove" ? "Remover este membro da organização?" : "Alterar a função deste membro?")) return;
    setBusy(true); setMessage(""); setFailed(false);
    const selectedRole = String(data.get("role") ?? role ?? "member");
    if (!["owner", "admin", "member", "viewer"].includes(selectedRole)) { setFailed(true); setMessage("Função inválida."); setBusy(false); return; }
    try {
      const result = action === "create" ? await authClient.organization.create({ name: String(data.get("name")), slug: String(data.get("slug")) })
        : action === "invite" || action === "resend" ? await authClient.organization.inviteMember({ organizationId, email: email ?? String(data.get("email")), role: selectedRole as "owner" | "admin" | "member" | "viewer", resend: action === "resend" })
        : action === "cancel" ? await authClient.organization.cancelInvitation({ invitationId: targetId! })
        : action === "role" ? await authClient.organization.updateMemberRole({ organizationId, memberId: targetId!, role: selectedRole as "owner" | "admin" | "member" | "viewer" })
        : action === "remove" ? await authClient.organization.removeMember({ organizationId, memberIdOrEmail: targetId! })
        : action === "select" ? await authClient.organization.setActive({ organizationId })
        : action === "accept" ? await authClient.organization.acceptInvitation({ invitationId: targetId! })
        : await authClient.organization.rejectInvitation({ invitationId: targetId! });
      if (result.error) throw new Error();
      form.reset(); setMessage("Operação concluída.");
      if (action === "accept" || action === "reject") router.push("/organizations");
      router.refresh();
    } catch { setFailed(true); setMessage("Não foi possível concluir. Confira os dados e suas permissões, atualize a página e tente novamente."); }
    finally { setBusy(false); }
  }
  return <form onSubmit={submit} aria-busy={busy} className="flex flex-col gap-3">
    <FieldSet disabled={busy}>
      <FieldGroup>
        {children}
        <div><Button type="submit" variant={variants[action] ?? "default"}>{busy ? "Aguarde…" : label}</Button></div>
      </FieldGroup>
    </FieldSet>
    {message && (failed ? <p role="alert" className="text-sm text-destructive">{message}</p> : <p role="status" className="text-sm text-muted-foreground">{message}</p>)}
  </form>;
}
