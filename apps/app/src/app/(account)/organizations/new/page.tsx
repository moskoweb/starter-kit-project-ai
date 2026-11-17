import { notFound } from "next/navigation";
import { getIdentityEnv } from "@vibe/config/env";
import { currentLocale } from "@/lib/panels/chrome";
import { accountOrganizationResource } from "@/lib/resources/definitions/account-organizations";
import { renderResource } from "@/lib/resources/render";

export default async function NewOrganizationPage() {
  if (getIdentityEnv().IDENTITY_PROFILE === "personal") notFound();
  const locale = await currentLocale();
  return renderResource(accountOrganizationResource, { panelTitle: locale === "en" ? "Account" : "Conta", basePath: "", route: ["organizations", "new"], query: {}, scope: { identifier: null, role: null }, locale });
}
