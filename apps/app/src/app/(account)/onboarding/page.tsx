import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Building2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@vibe/ui/components/card";
import { CreateOrganizationForm } from "@/components/organization/create-organization";
import { landingPath } from "@/components/organization/landing";
import { pageSession } from "@/lib/identity-session";
import { currentLocale } from "@/lib/panels/chrome";

const text = {
  "pt-BR": { title: "Crie sua organização", description: "Você ainda não participa de nenhuma organização. Crie a primeira para começar; convites recebidos por email também dão acesso." },
  en: { title: "Create your organization", description: "You are not a member of any organization yet. Create the first one to get started; invitations received by email also grant access." },
};

export const metadata: Metadata = { title: "Onboarding" };

/** Only for `organizations` profile users without any organization; everyone else goes to their landing panel. */
export default async function OnboardingPage() {
  const { headers } = await pageSession();
  const target = await landingPath(headers);
  if (target !== "/onboarding") redirect(target);
  const locale = await currentLocale();
  const copy = text[locale];
  return <div className="mx-auto flex w-full max-w-2xl flex-col py-6">
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><Building2 className="size-5" />{copy.title}</CardTitle><CardDescription>{copy.description}</CardDescription></CardHeader>
      <CardContent><CreateOrganizationForm locale={locale} /></CardContent>
    </Card>
  </div>;
}
