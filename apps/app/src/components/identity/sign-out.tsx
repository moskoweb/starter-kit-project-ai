"use client";
import { useState } from "react";
import { LogOut } from "lucide-react";
import { toast } from "sonner";
import { authClient } from "@vibe/auth/client";
import { Button } from "@vibe/ui/components/button";
import { Spinner } from "@vibe/ui/components/spinner";
export function SignOut({ locale = "pt-BR" }: { locale?: "pt-BR" | "en" }) {
  const [busy, setBusy] = useState(false);
  async function signOut() {
    setBusy(true);
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- full reload drops client state tied to the old session
    try { const result = await authClient.signOut(); if (result.error) throw new Error(); window.location.assign("/login"); }
    catch { toast.error(locale === "en" ? "Could not sign out. Try again." : "Não foi possível sair. Tente novamente."); setBusy(false); }
  }
  return <Button type="button" variant="outline" disabled={busy} onClick={() => void signOut()}>{busy ? <Spinner data-icon="inline-start" /> : <LogOut data-icon="inline-start" />}{locale === "en" ? "Sign out" : "Sair da conta"}</Button>;
}
