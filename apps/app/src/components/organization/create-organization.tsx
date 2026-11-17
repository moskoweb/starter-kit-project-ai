import { ResourceFormView } from "@/components/resources/resource-views";
import { accountOrganizationResource, accountOrganizationScope, accountResourceId } from "@/lib/resources/definitions/account-organizations";
import { localize } from "@/lib/resources/define";
import { resourceText } from "@/lib/resources/labels";
import { createRecord } from "@/lib/resources/resource-actions";
import type { Locale } from "@/lib/i18n";

/** Onboarding composes the same resource schema and authorized action as `/organizations/new`. */
export async function CreateOrganizationForm({ locale }: { locale: Locale }) {
  const scope = await accountOrganizationScope(null);
  return <ResourceFormView sections={localize(await accountOrganizationResource.form!(scope), locale)} basePath="/organizations" cancelHref="/organizations" text={resourceText[locale]} locale={locale} onSubmit={createRecord.bind(null, accountResourceId, "organizations", null)} />;
}
