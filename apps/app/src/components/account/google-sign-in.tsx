"use client";
import { useState } from "react";
import { toast } from "sonner";
import { authClient } from "@vibe/auth/client";
import { Button } from "@vibe/ui/components/button";
import { Spinner } from "@vibe/ui/components/spinner";

const text = {
  "pt-BR": { label: "Continuar com Google", error: "Não foi possível iniciar o login com Google." },
  en: { label: "Continue with Google", error: "Could not start Google sign-in." },
};

/** Better Auth social sign-in; rendered only when GOOGLE_ENABLED=true on the server. */
export function GoogleSignIn({ locale = "pt-BR" }: { locale?: "pt-BR" | "en" }) {
  const copy = text[locale];
  const [pending, setPending] = useState(false);
  async function signIn() {
    setPending(true);
    try {
      const result = await authClient.signIn.social({ provider: "google", callbackURL: "/", errorCallbackURL: "/login" });
      if (result.error) throw new Error();
    } catch { toast.error(copy.error); setPending(false); }
  }
  return <Button type="button" variant="outline" className="w-full" disabled={pending} onClick={() => void signIn()}>
    {pending ? <Spinner data-icon="inline-start" /> : <svg data-icon="inline-start" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" /></svg>}
    {copy.label}
  </Button>;
}
