"use client";
import { useEffect, useState } from "react";
import { Button } from "@vibe/ui/components/button";
import { Card, CardContent } from "@vibe/ui/components/card";
type InstallPrompt = Event & { prompt(): Promise<void>; userChoice: Promise<{ outcome: string }> };
export function PwaControls({ enabled, pushEnabled }: { enabled: boolean; pushEnabled: boolean }) {
  const [install, setInstall] = useState<InstallPrompt | null>(null);
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    let disposed = false;
    let registration: ServiceWorkerRegistration | undefined;
    const checkUpdate = () => { if (!disposed && registration?.waiting && navigator.serviceWorker.controller) setWaiting(registration.waiting); };
    const captureInstall = (event: Event) => { event.preventDefault(); setInstall(event as InstallPrompt); };
    if (enabled) window.addEventListener("beforeinstallprompt", captureInstall);
    void (async () => {
      if (!enabled && !pushEnabled) {
        const existing = await navigator.serviceWorker.getRegistration("/");
        if (existing && [existing.active, existing.waiting, existing.installing].some(worker => worker && new URL(worker.scriptURL).pathname === "/sw.js")) await existing.unregister();
        return;
      }
      registration = await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
      registration.addEventListener("updatefound", () => {
        const installing = registration?.installing;
        installing?.addEventListener("statechange", () => { if (installing.state === "installed") checkUpdate(); });
      });
    })().catch(() => { if (!disposed) setError("Não foi possível preparar recursos do navegador."); });
    return () => { disposed = true; window.removeEventListener("beforeinstallprompt", captureInstall); };
  }, [enabled, pushEnabled]);
  if (!enabled && !pushEnabled) return null;
  return <aside aria-label="Aplicativo instalável" className="fixed right-3 bottom-3 z-40 max-w-sm">
    <Card className="py-4">
      <CardContent className="flex flex-col items-start gap-2 px-4 text-sm">
        {enabled && install && <Button type="button" size="sm" onClick={async () => { try { await install.prompt(); await install.userChoice; setInstall(null); } catch { setError("Instalação não disponível."); } }}>Instalar aplicativo</Button>}
        {waiting && <Button type="button" size="sm" onClick={() => { waiting.postMessage({ type: "ACTIVATE_UPDATE" }); setWaiting(null); setError("Atualização ativada. Recarregue quando concluir seu trabalho."); }}>Ativar atualização</Button>}
        {enabled && !install && !waiting && <p className="text-muted-foreground">Instale pelo menu do navegador quando disponível. No iOS, use Adicionar à Tela de Início.</p>}
        {error && <p role="status">{error}</p>}
      </CardContent>
    </Card>
  </aside>;
}
