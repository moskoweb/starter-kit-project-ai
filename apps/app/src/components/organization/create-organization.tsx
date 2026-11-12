import { Field, FieldDescription, FieldLabel } from "@vibe/ui/components/field";
import { Input } from "@vibe/ui/components/input";
import { OrganizationForm } from "@/components/identity/organization-form";
import type { Locale } from "@/lib/i18n";
import { slugPattern } from "./shared";

const text = {
  "pt-BR": { name: "Nome", slug: "Identificador na URL", slugHelp: "Letras minúsculas, números e hífens. Exemplo: minha-equipe.", submit: "Criar organização" },
  en: { name: "Name", slug: "URL identifier", slugHelp: "Lowercase letters, numbers and hyphens. Example: my-team.", submit: "Create organization" },
};

/** Create organization through Better Auth, then open `/org/<slug>`. */
export function CreateOrganizationForm({ locale }: { locale: Locale }) {
  const copy = text[locale];
  return <OrganizationForm action="create" label={copy.submit} locale={locale}>
    <div className="grid gap-6 md:grid-cols-2">
      <Field><FieldLabel htmlFor="organization-name">{copy.name}</FieldLabel><Input id="organization-name" name="name" maxLength={100} required /></Field>
      <Field><FieldLabel htmlFor="organization-slug">{copy.slug}</FieldLabel><Input id="organization-slug" name="slug" pattern={slugPattern} maxLength={80} aria-describedby="slug-help" required /><FieldDescription id="slug-help">{copy.slugHelp}</FieldDescription></Field>
    </div>
  </OrganizationForm>;
}
