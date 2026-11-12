"use client";
import { useState } from "react";
import { UserRoundCog } from "lucide-react";
import { toast } from "sonner";
import { authClient } from "@vibe/auth/client";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@vibe/ui/components/alert";
import { Button } from "@vibe/ui/components/button";
import { Spinner } from "@vibe/ui/components/spinner";
import type { Locale } from "../../lib/i18n";

const text = {
  "pt-BR": { title: "Modo de personificação", acting: (name: string) => `Você está atuando como ${name}.`, stop: "Encerrar", failed: "Não foi possível encerrar a personificação." },
  en: { title: "Impersonation mode", acting: (name: string) => `You are acting as ${name}.`, stop: "Stop", failed: "Could not stop impersonating." },
};

/** Shown while an admin impersonates a user (Better Auth sets `session.impersonatedBy`). */
export function ImpersonationBanner({ locale }: { locale: Locale }) {
  const { data } = authClient.useSession();
  const [pending, setPending] = useState(false);
  if (!data?.session.impersonatedBy) return null;
  const copy = text[locale];

  async function stop() {
    setPending(true);
    const { error } = await authClient.admin.stopImpersonating();
    if (error) { setPending(false); toast.error(copy.failed); return; }
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- full reload drops client state tied to the old session
    window.location.assign("/admin");
  }

  return <Alert className="rounded-none border-x-0 border-t-0">
    <UserRoundCog />
    <AlertTitle>{copy.title}</AlertTitle>
    <AlertDescription>{copy.acting(data.user.name)}</AlertDescription>
    <AlertAction>
      <Button size="sm" variant="outline" onClick={stop} disabled={pending}>{pending && <Spinner data-icon="inline-start" />}{copy.stop}</Button>
    </AlertAction>
  </Alert>;
}
