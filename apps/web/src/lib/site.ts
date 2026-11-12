// Public, non-secret product name shown on the site. Set PUBLIC_PRODUCT_NAME at build time.
export const productName = import.meta.env.PUBLIC_PRODUCT_NAME?.trim() || "Vibe Starter Kit";

export type Lang = "pt-BR" | "en";

/** Localized routes; keys shared by both locales so the language switch maps 1:1. */
export const routes = {
  home: { "pt-BR": "/", en: "/en/" },
  gettingStarted: { "pt-BR": "/getting-started/", en: "/en/getting-started/" },
  privacy: { "pt-BR": "/privacidade/", en: "/en/privacy/" },
  terms: { "pt-BR": "/termos/", en: "/en/terms/" },
  cookies: { "pt-BR": "/cookies/", en: "/en/cookies/" },
} as const;
