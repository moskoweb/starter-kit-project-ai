import "server-only";
import Link from "next/link";
import { forbidden, notFound } from "next/navigation";
import { Pencil, Plus } from "lucide-react";
import { buttonVariants } from "@vibe/ui/components/button";
import { PageHeader } from "@vibe/ui/components/resource/page-header";
import { ResourceInfolist } from "@vibe/ui/components/resource/resource-infolist";
import type { RecordActionDef, ResourceRecord } from "@vibe/ui/lib/schema";
import { RecordActionsView, ResourceFormView, ResourceTableView } from "../../components/resources/resource-views";
import { DeleteRecord } from "../../components/resources/delete-record";
import type { PanelConfig } from "../panels/registry";
import type { Locale } from "../i18n";
import { pageSession } from "../identity-session";
import { localize, t, type Operation, type ResourceDefinition, type ResourceScope } from "./define";
import { resourceText } from "./labels";
import { parseListState } from "./list-state";
import { createRecord, deleteRecords, runRecordAction, updateRecord } from "./resource-actions";

/** Route passes tenant data; user id and superadmin flag are re-read from the session here. */
type Context = { panel: PanelConfig; panelTitle: string; basePath: string; route: string[]; query: Record<string, string | string[] | undefined>; scope: Pick<ResourceScope, "identifier" | "role">; locale: Locale };

/** Filament-style resource pages: index (table), create, view (infolist) and edit. */
export async function renderResource(resource: ResourceDefinition, { panel, panelTitle, basePath, route, query, scope: tenant, locale }: Context) {
  const { session } = await pageSession();
  const isAdmin = session.user.role === "admin";
  if (panel.context === "global" && !isAdmin) forbidden();
  const scope: ResourceScope = { ...tenant, userId: session.user.id, isAdmin };
  const base = `${basePath}/${resource.slug}`;
  const text = resourceText[locale];
  const can = (operation: Operation) => resource.can(scope.role, operation, scope) && (operation === "read" || resource[operation] !== undefined);
  if (!can("read")) forbidden();
  const crumbs = [{ label: panelTitle, href: basePath }, { label: t(resource.pluralLabel, locale), href: base }];
  const remove = deleteRecords.bind(null, panel.id, resource.slug, scope.identifier);
  const act = runRecordAction.bind(null, panel.id, resource.slug, scope.identifier);
  const actions = resource.actions ?? [];
  const actionDefs: RecordActionDef[] = actions.map(({ visible: _visible, run: _run, ...def }) => localize(def, locale));
  const allowed = (record: ResourceRecord) => actions.filter(action => !action.visible || action.visible(record, scope)).map(action => action.name);
  const [first, second, third] = route.slice(1);

  if (first === undefined) {
    const filters = localize(await resource.table.filters?.(scope) ?? [], locale);
    const state = parseListState(resource, query, filters);
    const { records, total } = await resource.list(scope, state);
    return <>
      <PageHeader title={t(resource.pluralLabel, locale)} description={resource.description && t(resource.description, locale)} breadcrumbs={[crumbs[0]!, { label: t(resource.pluralLabel, locale) }]}
        actions={can("create") && resource.form && <Link href={`${base}/new`} className={buttonVariants()}><Plus data-icon="inline-start" />{text.create} {t(resource.label, locale).toLowerCase()}</Link>} />
      <ResourceTableView columns={localize(resource.table.columns, locale)} filters={filters} records={records} total={total} state={state} basePath={base} storageKey={`${panel.id}:${resource.slug}`} locale={locale} text={text}
        permissions={{ create: can("create"), view: true, update: can("update") && !!resource.form, delete: can("delete"), bulkDelete: can("delete") }} onDelete={can("delete") ? remove : undefined}
        recordActions={actionDefs} availableActions={Object.fromEntries(records.map(record => [record.id, allowed(record)]))} onRecordAction={actions.length ? act : undefined} />
    </>;
  }

  if (first === "new" && second === undefined) {
    if (!can("create") || !resource.form) forbidden();
    const title = `${text.create} ${t(resource.label, locale).toLowerCase()}`;
    return <>
      <PageHeader title={title} breadcrumbs={[...crumbs, { label: title }]} />
      <ResourceFormView sections={localize(await resource.form(scope), locale)} basePath={base} cancelHref={base} text={text} locale={locale} onSubmit={createRecord.bind(null, panel.id, resource.slug, scope.identifier)} />
    </>;
  }

  if (!/^[0-9a-f-]{36}$/i.test(first) || (second !== undefined && second !== "edit") || third !== undefined) notFound();
  const record = await resource.get(scope, first);
  if (!record) notFound();
  const title = String(record[resource.titleKey] ?? t(resource.label, locale));
  const recordHref = `${base}/${encodeURIComponent(record.id)}`;

  if (second === "edit") {
    if (!can("update") || !resource.form) forbidden();
    return <>
      <PageHeader title={`${text.edit} ${title}`} breadcrumbs={[...crumbs, { label: title, href: recordHref }, { label: text.edit }]}
        actions={can("delete") && <DeleteRecord id={record.id} text={text} redirectTo={base} onDelete={remove} />} />
      <ResourceFormView sections={localize(await resource.form(scope), locale)} record={record} basePath={base} cancelHref={recordHref} text={text} locale={locale} onSubmit={updateRecord.bind(null, panel.id, resource.slug, scope.identifier, record.id)} />
    </>;
  }

  const visibleActions = allowed(record);
  return <>
    <PageHeader title={title} breadcrumbs={[...crumbs, { label: title }]}
      actions={<>
        {visibleActions.length > 0 && <RecordActionsView id={record.id} actions={actionDefs.filter(action => visibleActions.includes(action.name))} text={text} onRecordAction={act} />}
        {can("update") && resource.form && <Link href={`${recordHref}/edit`} className={buttonVariants({ variant: "outline" })}><Pencil data-icon="inline-start" />{text.edit}</Link>}
        {can("delete") && <DeleteRecord id={record.id} text={text} redirectTo={base} onDelete={remove} />}
      </>} />
    <ResourceInfolist sections={localize(await resource.infolist(scope), locale)} record={record} labels={text} locale={locale} />
  </>;
}
