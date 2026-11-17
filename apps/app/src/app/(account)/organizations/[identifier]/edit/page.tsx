import { notFound } from "next/navigation";
import { getIdentityEnv } from "@vibe/config/env";
import { currentLocale } from "@/lib/panels/chrome";
import { accountOrganizationResource } from "@/lib/resources/definitions/account-organizations";
import { renderResource } from "@/lib/resources/render";

export default async function EditOrganizationPage({ params }: { params: Promise<{ identifier: string }> }) {
  if (getIdentityEnv().IDENTITY_PROFILE === "personal") notFound();
  const { identifier } = await params;
  const locale = await currentLocale();
  return renderResource(accountOrganizationResource, { panelTitle: locale === "en" ? "Account" : "Conta", basePath: "", route: ["organizations", identifier, "edit"], query: {}, scope: { identifier, role: null }, locale });
}
