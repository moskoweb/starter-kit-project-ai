"use client";
import { useState } from "react";
import { authClient } from "@vibe/auth/client";
export function SignOut({ locale = "pt-BR" }: { locale?: "pt-BR" | "en" }) {
  const [busy, setBusy] = useState(false); const [error, setError] = useState(false);
  return <form onSubmit={async (event) => { event.preventDefault(); setBusy(true); setError(false); try { const result = await authClient.signOut(); if (result.error) throw new Error(); window.location.assign("/login"); } catch { setError(true); setBusy(false); } }}><button className="underline disabled:opacity-50" disabled={busy}>{locale === "en" ? "Sign out" : "Sair da conta"}</button>{error && <p role="alert">{locale === "en" ? "Could not sign out. Try again." : "Não foi possível sair. Tente novamente."}</p>}</form>;
}
