"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import type { Locale } from "@/lib/i18n";

const text = {
  "pt-BR": {
    title: "Assistente de IA", prompt: "Sua pergunta", send: "Enviar pergunta", cancel: "Cancelar resposta",
    working: "Gerando resposta…", cancelled: "Resposta cancelada. O uso já reservado pode ser contabilizado.",
    done: "Resposta concluída.", empty: "Resposta concluída sem texto.", answer: "Resposta",
    error: "Não foi possível concluir a resposta. Tente novamente.", limit: "Limite de uso atingido (429). Aguarde antes de tentar novamente.",
    forbidden: "Sem permissão para usar IA neste espaço.", unauthorized: "Sua sessão expirou. Entre novamente.",
    unavailable: "Assistente indisponível neste ambiente.",
  },
  en: {
    title: "AI assistant", prompt: "Your question", send: "Send question", cancel: "Cancel response",
    working: "Generating response…", cancelled: "Response cancelled. Reserved usage may still be counted.",
    done: "Response complete.", empty: "Response completed without text.", answer: "Response",
    error: "Could not complete the response. Try again.", limit: "Usage limit reached (429). Wait before trying again.",
    forbidden: "You do not have permission to use AI in this workspace.", unauthorized: "Your session expired. Sign in again.",
    unavailable: "Assistant unavailable in this environment.",
  },
} as const;

type Props = { enabled: boolean; tenantIdentifier: string | null; locale?: Locale };

/** Owner supplies server-side feature flag; disabled UI never mounts or sends requests. */
export function AiAssistant({ enabled, tenantIdentifier, locale = "pt-BR" }: Props) {
  return enabled ? <ActiveAssistant key={tenantIdentifier ?? "personal"} tenantIdentifier={tenantIdentifier} locale={locale} /> : null;
}

function ActiveAssistant({ tenantIdentifier, locale }: { tenantIdentifier: string | null; locale: Locale }) {
  const t = text[locale];
  const id = useId();
  const controller = useRef<AbortController | null>(null);
  const [prompt, setPrompt] = useState("");
  const [answer, setAnswer] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => () => { controller.current?.abort(); controller.current = null; }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (controller.current || !prompt.trim()) return;
    const request = new AbortController();
    controller.current = request;
    setPending(true); setAnswer(""); setError(""); setStatus(t.working);
    try {
      const response = await fetch("/api/ai", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim(), tenantIdentifier }), signal: request.signal,
      });
      if (!response.ok) {
        if (controller.current === request) {
          setError(response.status === 429 ? t.limit : response.status === 401 ? t.unauthorized : response.status === 403 ? t.forbidden : response.status === 404 ? t.unavailable : t.error);
          setStatus("");
        }
        return;
      }
      if (!response.body) throw new Error("EMPTY_STREAM");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let received = false;
      try {
        while (true) {
          const { done, value } = await reader.read();
          const chunk = done ? decoder.decode() : decoder.decode(value, { stream: true });
          if (controller.current !== request) return;
          if (chunk) { received = true; setAnswer(previous => previous + chunk); }
          if (done) break;
        }
      } finally { reader.releaseLock(); }
      if (controller.current === request) setStatus(request.signal.aborted ? t.cancelled : received ? t.done : t.empty);
    } catch {
      if (controller.current === request) {
        setStatus(request.signal.aborted ? t.cancelled : "");
        if (!request.signal.aborted) setError(t.error);
      }
    } finally {
      if (controller.current === request) { controller.current = null; setPending(false); }
    }
  }

  return <section aria-labelledby={`${id}-title`} className="space-y-3">
    <h2 id={`${id}-title`} className="text-xl font-semibold">{t.title}</h2>
    <form onSubmit={event => void submit(event)} className="space-y-3">
      <label htmlFor={`${id}-prompt`} className="block font-medium">{t.prompt}</label>
      <textarea id={`${id}-prompt`} value={prompt} onChange={event => setPrompt(event.target.value)} required maxLength={32_000} rows={4} disabled={pending} className="block w-full rounded border bg-transparent p-3 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60" />
      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={pending || !prompt.trim()} className="rounded border px-4 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60">{t.send}</button>
        {pending && <button type="button" onClick={() => controller.current?.abort()} className="rounded border px-4 py-2 focus-visible:outline-2 focus-visible:outline-offset-2">{t.cancel}</button>}
      </div>
    </form>
    <p role="status">{status}</p>
    {error && <p role="alert">{error}</p>}
    {answer && <div aria-label={t.answer} aria-busy={pending} className="whitespace-pre-wrap break-words border-t pt-3">{answer}</div>}
  </section>;
}
