"use client";

import { useEffect, useState } from "react";
import { Button } from "@vibe/ui/components/button";
import { Card, CardContent } from "@vibe/ui/components/card";

const CONSENT_KEY = "analytics-consent";
const DISTINCT_ID_KEY = "analytics-distinct-id";

export function AnalyticsConsent() {
  const [consent, setConsent] = useState<string | null>(null);
  useEffect(() => setConsent(localStorage.getItem(CONSENT_KEY)), []);
  useEffect(() => {
    if (consent !== "accepted" || process.env.NEXT_PUBLIC_ANALYTICS_ENABLED !== "true") return;
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;
    if (!key || !host) {
      console.error("Analytics enabled but PostHog key or host is missing");
      return;
    }
    let endpoint: URL;
    try {
      endpoint = new URL("/capture/", host);
      if (endpoint.protocol !== "https:") return;
    } catch {
      return;
    }
    if (window.location.pathname !== "/") return;
    let distinctId = localStorage.getItem(DISTINCT_ID_KEY);
    if (!distinctId) {
      distinctId = crypto.randomUUID();
      localStorage.setItem(DISTINCT_ID_KEY, distinctId);
    }
    void fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ api_key: key, event: "$pageview", distinct_id: distinctId, properties: { $current_url: window.location.origin + "/" } }),
      keepalive: true,
    }).catch(() => {});
  }, [consent]);
  if (process.env.NEXT_PUBLIC_ANALYTICS_ENABLED !== "true") return null;
  if (consent === "accepted") return <Button type="button" variant="link" size="sm" onClick={() => setAnalyticsConsent(false, setConsent)}>Revoke analytics consent</Button>;
  if (consent === "denied") return <Button type="button" variant="link" size="sm" onClick={() => setAnalyticsConsent(true, setConsent)}>Allow analytics</Button>;
  return <div role="region" aria-label="Analytics consent" className="fixed bottom-3 left-3 z-40 max-w-sm">
    <Card className="py-4">
      <CardContent className="flex flex-wrap items-center justify-between gap-3 px-4 text-sm">
        <span>Allow anonymous analytics?</span>
        <div className="flex gap-2">
          <Button type="button" size="sm" onClick={() => setAnalyticsConsent(true, setConsent)}>Allow</Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setAnalyticsConsent(false, setConsent)}>Decline</Button>
        </div>
      </CardContent>
    </Card>
  </div>;
}

export function setAnalyticsConsent(accepted: boolean, update?: (value: string) => void): void {
  const value = accepted ? "accepted" : "denied";
  localStorage.setItem(CONSENT_KEY, value);
  if (!accepted) localStorage.removeItem(DISTINCT_ID_KEY);
  update?.(value);
}
