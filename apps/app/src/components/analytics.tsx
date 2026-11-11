"use client";

import { useEffect, useState } from "react";

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
      body: JSON.stringify({ api_key: key, event: "$pageview", distinct_id: distinctId, properties: { $current_url: endpoint.origin + "/" } }),
      keepalive: true,
    }).catch(() => {});
  }, [consent]);
  if (process.env.NEXT_PUBLIC_ANALYTICS_ENABLED !== "true") return null;
  if (consent === "accepted") return <button type="button" onClick={() => setAnalyticsConsent(false, setConsent)}>Revoke analytics consent</button>;
  if (consent === "denied") return <button type="button" onClick={() => setAnalyticsConsent(true, setConsent)}>Allow analytics</button>;
  return <div aria-label="Analytics consent"><span>Allow anonymous analytics?</span><button type="button" onClick={() => setAnalyticsConsent(true, setConsent)}>Allow</button><button type="button" onClick={() => setAnalyticsConsent(false, setConsent)}>Decline</button></div>;
}

export function setAnalyticsConsent(accepted: boolean, update?: (value: string) => void): void {
  const value = accepted ? "accepted" : "denied";
  localStorage.setItem(CONSENT_KEY, value);
  if (!accepted) localStorage.removeItem(DISTINCT_ID_KEY);
  update?.(value);
}
