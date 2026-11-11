"use client";
import { useState, type ReactNode, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@vibe/auth/client";
type Action = "create" | "invite" | "cancel" | "resend" | "role" | "remove" | "select" | "accept" | "reject";
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
  return <form onSubmit={submit} aria-busy={busy} className="space-y-3"><fieldset disabled={busy} className="space-y-3">{children}<button className="rounded-md border px-4 py-2 disabled:opacity-50" type="submit">{busy ? "Aguarde…" : label}</button></fieldset>{message && <p role={failed ? "alert" : "status"}>{message}</p>}</form>;
}
