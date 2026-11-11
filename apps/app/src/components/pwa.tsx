"use client";
import { useEffect, useState } from "react";
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
  return <aside aria-label="Aplicativo instalável" className="fixed bottom-3 right-3 z-40 max-w-sm rounded border bg-background p-3 text-sm">{enabled && install && <button onClick={async () => { try { await install.prompt(); await install.userChoice; setInstall(null); } catch { setError("Instalação não disponível."); } }}>Instalar aplicativo</button>}{waiting && <button onClick={() => { waiting.postMessage({ type: "ACTIVATE_UPDATE" }); setWaiting(null); setError("Atualização ativada. Recarregue quando concluir seu trabalho."); }}>Ativar atualização</button>}{enabled && !install && !waiting && <span>Instale pelo menu do navegador quando disponível. No iOS, use Adicionar à Tela de Início.</span>}{error && <p role="status">{error}</p>}</aside>;
}
