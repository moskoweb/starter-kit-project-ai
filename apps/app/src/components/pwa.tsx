"use client";
import { useEffect, useState } from "react";
import { Download, RefreshCw, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@vibe/ui/components/button";
import { Card, CardContent } from "@vibe/ui/components/card";

type InstallPrompt = Event & { prompt(): Promise<void>; userChoice: Promise<{ outcome: string }> };
const DISMISSED_KEY = "pwa-install-dismissed";

/** Registers /sw.js when PWA or push is enabled. UI appears only when the browser offers install or an update is waiting. */
export function PwaControls({ enabled, pushEnabled }: { enabled: boolean; pushEnabled: boolean }) {
  const [install, setInstall] = useState<InstallPrompt | null>(null);
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    let disposed = false;
    let registration: ServiceWorkerRegistration | undefined;
    const checkUpdate = () => { if (!disposed && registration?.waiting && navigator.serviceWorker.controller) setWaiting(registration.waiting); };
    const captureInstall = (event: Event) => { event.preventDefault(); if (localStorage.getItem(DISMISSED_KEY) !== "1") setInstall(event as InstallPrompt); };
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
    })().catch(() => { if (!disposed) toast.error("Não foi possível preparar recursos do navegador."); });
    return () => { disposed = true; window.removeEventListener("beforeinstallprompt", captureInstall); };
  }, [enabled, pushEnabled]);

  if (!install && !waiting) return null;
  function dismiss() { localStorage.setItem(DISMISSED_KEY, "1"); setInstall(null); }
  return <aside aria-label="Aplicativo" className="fixed right-3 bottom-3 z-40 max-w-sm">
    <Card className="py-3">
      <CardContent className="flex items-center gap-2 px-3 text-sm">
        {waiting ? <>
          <span className="flex-1">Nova versão disponível.</span>
          <Button size="sm" onClick={() => { waiting.postMessage({ type: "ACTIVATE_UPDATE" }); setWaiting(null); toast.success("Atualização ativada. Recarregue quando concluir seu trabalho."); }}><RefreshCw data-icon="inline-start" />Atualizar</Button>
        </> : <>
          <span className="flex-1">Instale o aplicativo neste dispositivo.</span>
          <Button size="sm" onClick={async () => { try { await install!.prompt(); await install!.userChoice; } catch { toast.error("Instalação não disponível."); } setInstall(null); }}><Download data-icon="inline-start" />Instalar</Button>
          <Button size="icon-sm" variant="ghost" aria-label="Dispensar" onClick={dismiss}><X /></Button>
        </>}
      </CardContent>
    </Card>
  </aside>;
}
