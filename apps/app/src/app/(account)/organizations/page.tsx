import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getIdentityEnv } from "@vibe/config/env";
import { currentLocale } from "@/lib/panels/chrome";
import { accountOrganizationResource } from "@/lib/resources/definitions/account-organizations";
import { renderResource } from "@/lib/resources/render";

export const metadata: Metadata = { title: "Organizações" };
export default async function OrganizationsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  if (getIdentityEnv().IDENTITY_PROFILE === "personal") notFound();
  const locale = await currentLocale();
  return renderResource(accountOrganizationResource, { panelTitle: locale === "en" ? "Account" : "Conta", basePath: "", route: ["organizations"], query: await searchParams, scope: { identifier: null, role: null }, locale });
}
