"use client";
import { toast } from "sonner";
import { authClient } from "@vibe/auth/client";
import { Button } from "@vibe/ui/components/button";
import { ConfirmAction } from "@vibe/ui/components/resource/confirm-action";

const text = {
  "pt-BR": { trigger: "Excluir conta", title: "Excluir sua conta?", description: "Enviaremos um link de confirmação ao seu email. A conta e todas as sessões serão removidas permanentemente após a confirmação. Proprietários únicos de organizações precisam transferir a propriedade antes.", confirm: "Enviar confirmação", cancel: "Cancelar", sent: "Confira seu email para confirmar a exclusão.", error: "Não foi possível solicitar a exclusão da conta." },
  en: { trigger: "Delete account", title: "Delete your account?", description: "We will email you a confirmation link. Your account and all sessions are permanently removed after confirmation. Sole organization owners must transfer ownership first.", confirm: "Send confirmation", cancel: "Cancel", sent: "Check your email to confirm deletion.", error: "Could not request account deletion." },
};

export function DeleteAccount({ locale = "pt-BR" }: { locale?: "pt-BR" | "en" }) {
  const copy = text[locale];
  return <ConfirmAction destructive trigger={<Button variant="destructive">{copy.trigger}</Button>} title={copy.title} description={copy.description} confirmLabel={copy.confirm} cancelLabel={copy.cancel} onConfirm={async () => {
    const result = await authClient.deleteUser({ callbackURL: "/login" }).catch(() => null);
    if (!result || result.error) {
      // Server message explains blocking reasons such as sole organization ownership.
      toast.error(result?.error?.message || copy.error);
      throw new Error("DELETE_REQUEST_FAILED");
    }
    toast.success(copy.sent);
  }} />;
}
