"use client";
import { useEffect, useState } from "react";
import { authClient } from "@vibe/auth/client";

export function InvitationForm({ id }: { id: string }) {
  const [invitation, setInvitation] = useState<{ email: string; role: string; status: string; organizationId: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    let active = true;
    void authClient.organization.getInvitation({ query: { id } }).then(result => {
      if (!active) return;
      if (result.error) setMessage(result.error.message ?? "Não foi possível carregar o convite.");
      else if (result.data) setInvitation({ email: result.data.email, role: result.data.role, status: result.data.status, organizationId: result.data.organizationId });
    }).catch(error => { if (active) setMessage(error instanceof Error ? error.message : "Não foi possível carregar o convite."); });
    return () => { active = false; };
  }, [id]);
  async function act(action: () => Promise<{ error?: { message?: string } | null }>) {
    setBusy(true); setMessage("");
    try { const result = await action(); if (result.error) setMessage(result.error.message ?? "Ação falhou."); else { setMessage("Convite atualizado."); setInvitation(current => current ? { ...current, status: "respondido" } : current); } }
    catch (error) { setMessage(error instanceof Error ? error.message : "Ação falhou."); }
    finally { setBusy(false); }
  }
  return <section>
    {invitation && <dl><dt>Organização (ID)</dt><dd>{invitation.organizationId}</dd><dt>Email</dt><dd>{invitation.email}</dd><dt>Função</dt><dd>{invitation.role}</dd><dt>Status</dt><dd>{invitation.status}</dd></dl>}
    {invitation?.status === "pending" && <><button disabled={busy} onClick={() => void act(() => authClient.organization.acceptInvitation({ invitationId: id }))}>Aceitar convite</button><button disabled={busy} onClick={() => void act(() => authClient.organization.rejectInvitation({ invitationId: id }))}>Recusar convite</button></>}
    {message && <p role="alert">{message}</p>}
  </section>;
}
