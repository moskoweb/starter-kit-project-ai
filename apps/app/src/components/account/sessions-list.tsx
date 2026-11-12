"use client";
import { useRouter } from "next/navigation";
import { Monitor, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { authClient } from "@vibe/auth/client";
import { Badge } from "@vibe/ui/components/badge";
import { Button } from "@vibe/ui/components/button";
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemTitle } from "@vibe/ui/components/item";
import { ConfirmAction } from "@vibe/ui/components/resource/confirm-action";

export type SessionRow = { token: string; userAgent: string | null; ipAddress: string | null; createdAt: string; current: boolean };

const text = {
  "pt-BR": { current: "Atual", unknown: "Dispositivo desconhecido", ip: "IP", created: "Iniciada em", revoke: "Encerrar", revokeTitle: "Encerrar sessão?", revokeDescription: "O dispositivo precisará entrar novamente.", others: "Encerrar outras sessões", othersTitle: "Encerrar todas as outras sessões?", othersDescription: "Todos os outros dispositivos precisarão entrar novamente.", cancel: "Cancelar", done: "Sessão encerrada.", othersDone: "Outras sessões encerradas.", error: "Não foi possível encerrar a sessão." },
  en: { current: "Current", unknown: "Unknown device", ip: "IP", created: "Started", revoke: "Revoke", revokeTitle: "Revoke session?", revokeDescription: "That device will need to sign in again.", others: "Revoke other sessions", othersTitle: "Revoke all other sessions?", othersDescription: "All other devices will need to sign in again.", cancel: "Cancel", done: "Session revoked.", othersDone: "Other sessions revoked.", error: "Could not revoke session." },
};

// ponytail: regex covers common browsers/OS; swap for a UA parser if exact device names matter.
function describe(userAgent: string | null) {
  if (!userAgent) return null;
  const browser = /Edg\//.test(userAgent) ? "Edge" : /OPR\//.test(userAgent) ? "Opera" : /Firefox\//.test(userAgent) ? "Firefox" : /Chrome\//.test(userAgent) ? "Chrome" : /Safari\//.test(userAgent) ? "Safari" : null;
  const os = /iPhone|iPad/.test(userAgent) ? "iOS" : /Android/.test(userAgent) ? "Android" : /Windows/.test(userAgent) ? "Windows" : /Mac OS X/.test(userAgent) ? "macOS" : /Linux/.test(userAgent) ? "Linux" : null;
  return { label: [browser, os].filter(Boolean).join(" · ") || userAgent.slice(0, 60), mobile: /Mobile|Android|iPhone|iPad/.test(userAgent) };
}

/** Lists Better Auth sessions; revocation uses revokeSession / revokeOtherSessions. */
export function SessionsList({ sessions, locale = "pt-BR" }: { sessions: SessionRow[]; locale?: "pt-BR" | "en" }) {
  const copy = text[locale];
  const router = useRouter();
  const format = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" });
  async function run(action: () => Promise<{ error?: unknown }>, success: string) {
    const result = await action().catch(() => null);
    if (!result || result.error) { toast.error(copy.error); throw new Error("REVOKE_FAILED"); }
    toast.success(success); router.refresh();
  }
  return <div className="flex flex-col gap-4">
    <ItemGroup className="gap-2">
      {sessions.map(session => {
        const device = describe(session.userAgent);
        const Icon = device?.mobile ? Smartphone : Monitor;
        return <Item key={session.token} variant="outline">
          <ItemMedia variant="icon"><Icon /></ItemMedia>
          <ItemContent>
            <ItemTitle title={session.userAgent ?? undefined}>{device?.label ?? copy.unknown}{session.current && <Badge>{copy.current}</Badge>}</ItemTitle>
            <ItemDescription>{copy.ip}: {session.ipAddress || "—"} · {copy.created} {format.format(new Date(session.createdAt))}</ItemDescription>
          </ItemContent>
          {!session.current && <ItemActions>
            <ConfirmAction destructive trigger={<Button variant="outline" size="sm">{copy.revoke}</Button>} title={copy.revokeTitle} description={copy.revokeDescription} confirmLabel={copy.revoke} cancelLabel={copy.cancel} onConfirm={() => run(() => authClient.revokeSession({ token: session.token }), copy.done)} />
          </ItemActions>}
        </Item>;
      })}
    </ItemGroup>
    {sessions.some(session => !session.current) && <div>
      <ConfirmAction destructive trigger={<Button variant="destructive">{copy.others}</Button>} title={copy.othersTitle} description={copy.othersDescription} confirmLabel={copy.others} cancelLabel={copy.cancel} onConfirm={() => run(() => authClient.revokeOtherSessions(), copy.othersDone)} />
    </div>}
  </div>;
}
