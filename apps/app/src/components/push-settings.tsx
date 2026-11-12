"use client";

import { useEffect, useState } from "react";
import { z } from "zod";
import { Button } from "@vibe/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@vibe/ui/components/card";
import type { Locale } from "@/lib/i18n";

function applicationKey(value: string): Uint8Array<ArrayBuffer> {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return Uint8Array.from(atob(padded), char => char.charCodeAt(0));
}
const pushConfig = z.object({ publicKey: z.string().min(1), enabled: z.boolean() }).strict();

export function PushSettings({ enabled, tenantIdentifier = null, locale }: { enabled: boolean; tenantIdentifier?: string | null; locale: Locale }) {
  const [subscribed, setSubscribed] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const t = locale === "en"
    ? { on: "Disable push notifications", off: "Enable push notifications", unsupported: "Push notifications are unavailable in this browser.", failed: "Could not update push notification settings." }
    : { on: "Desativar notificações push", off: "Ativar notificações push", unsupported: "Notificações push indisponíveis neste navegador.", failed: "Não foi possível atualizar notificações push." };
  const scope: Record<string, string> = tenantIdentifier ? { tenantIdentifier } : {};

  useEffect(() => {
    if (!enabled || !("serviceWorker" in navigator) || !("PushManager" in window)) return;
    const controller = new AbortController();
    void navigator.serviceWorker.getRegistration().then(async registration => {
      const subscription = await registration?.pushManager.getSubscription();
      if (!subscription || controller.signal.aborted) return;
      const query = new URLSearchParams({ endpoint: subscription.endpoint });
      if (tenantIdentifier) query.set("tenantIdentifier", tenantIdentifier);
      const response = await fetch(`/api/push?${query}`, { cache: "no-store", signal: controller.signal });
      if (!response.ok) return;
      const data: unknown = await response.json();
      const parsed = z.object({ enabled: z.boolean() }).safeParse(data);
      if (parsed.success && !controller.signal.aborted) setSubscribed(parsed.data.enabled);
    }).catch(() => {});
    return () => controller.abort();
  }, [enabled, tenantIdentifier]);

  async function toggle() {
    setPending(true); setError("");
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      if (!enabled || !("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) throw new Error("UNAVAILABLE");
      const permission = subscribed ? Notification.permission : await Notification.requestPermission();
      if (!subscribed && permission !== "granted") throw new Error("PERMISSION_DENIED");
      const { promise, reject } = Promise.withResolvers<ServiceWorkerRegistration>();
      timer = setTimeout(() => reject(new Error("WORKER_TIMEOUT")), 10000);
      const registration = await Promise.race([navigator.serviceWorker.ready, promise]);
      clearTimeout(timer); timer = undefined;
      const existing = await registration.pushManager.getSubscription();
      if (subscribed) {
        if (!existing) { setSubscribed(false); return; }
        const response = await fetch("/api/push", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...scope, action: "unsubscribe", subscription: { endpoint: existing.endpoint } }) });
        if (!response.ok && response.status !== 404) throw new Error("REQUEST_FAILED");
        await existing.unsubscribe();
        setSubscribed(false);
      } else {
        const query = new URLSearchParams(scope);
        if (existing) query.set("endpoint", existing.endpoint);
        const response = await fetch(`/api/push?${query}`, { cache: "no-store" });
        if (!response.ok) throw new Error("REQUEST_FAILED");
        const parsed = pushConfig.safeParse(await response.json());
        if (!parsed.success) throw new Error("INVALID_CONFIG");
        const subscription = existing ?? await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: applicationKey(parsed.data.publicKey) });
        const saved = await fetch("/api/push", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...scope, action: "subscribe", subscription: subscription.toJSON() }) });
        if (!saved.ok) throw new Error("REQUEST_FAILED");
        setSubscribed(true);
      }
    } catch { setError(!enabled || !("serviceWorker" in navigator) || !("PushManager" in window) ? t.unsupported : t.failed); }
    finally { if (timer) clearTimeout(timer); setPending(false); }
  }

  if (!enabled) return null;
  return <Card role="region" aria-labelledby="push-settings-title">
    <CardHeader>
      <CardTitle><h2 id="push-settings-title">{locale === "en" ? "Push notifications" : "Notificações push"}</h2></CardTitle>
    </CardHeader>
    <CardContent className="flex flex-col gap-2">
      <Button type="button" variant={subscribed ? "outline" : "default"} className="self-start" disabled={pending} onClick={() => void toggle()}>{subscribed ? t.on : t.off}</Button>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </CardContent>
  </Card>;
}
