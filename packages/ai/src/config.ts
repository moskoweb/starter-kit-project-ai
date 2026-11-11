export type AiEnvironment = Readonly<{
  AI_ENABLED?: string;
  AI_API_KEY?: string;
  AI_BASE_URL?: string;
  AI_MODEL?: string;
}>;

export type AiConfig =
  | Readonly<{ enabled: false }>
  | Readonly<{ enabled: true; apiKey: string; baseURL: string; model: string }>;

/** No environment reads or network calls at import time. Never serialize this result. */
export function readAiConfig(env: AiEnvironment): AiConfig {
  if (env.AI_ENABLED === undefined || env.AI_ENABLED === "false") {
    return { enabled: false };
  }
  if (env.AI_ENABLED !== "true") {
    throw new Error("AI_ENABLED must be true or false.");
  }
  const apiKey = env.AI_API_KEY?.trim();
  const model = env.AI_MODEL?.trim();
  if (!apiKey) throw new Error("AI_API_KEY is required when AI_ENABLED=true.");
  if (!model) throw new Error("AI_MODEL is required when AI_ENABLED=true.");
  let url: URL;
  try {
    url = new URL(env.AI_BASE_URL ?? "https://api.openai.com/v1");
  } catch {
    throw new Error("AI_BASE_URL must be an absolute HTTPS URL.");
  }
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) {
    throw new Error("AI_BASE_URL must use HTTPS without credentials, query or fragment.");
  }
  return { enabled: true, apiKey, model, baseURL: url.href.replace(/\/$/, "") };
}
