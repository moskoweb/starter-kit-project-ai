"use client";
import { useState } from "react";
import { authClient } from "@vibe/auth/client";
import { Button } from "@vibe/ui/components/button";
export function SignOut({ locale = "pt-BR" }: { locale?: "pt-BR" | "en" }) {
  const [busy, setBusy] = useState(false); const [error, setError] = useState(false);
  return <form className="flex flex-col gap-2" onSubmit={async (event) => { event.preventDefault(); setBusy(true); setError(false); try { const result = await authClient.signOut(); if (result.error) throw new Error(); window.location.assign("/login"); } catch { setError(true); setBusy(false); } }}><div><Button type="submit" variant="outline" disabled={busy}>{locale === "en" ? "Sign out" : "Sair da conta"}</Button></div>{error && <p role="alert" className="text-sm text-destructive">{locale === "en" ? "Could not sign out. Try again." : "Não foi possível sair. Tente novamente."}</p>}</form>;
}
