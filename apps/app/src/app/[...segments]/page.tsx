import { WebhookDeliveries } from "../../components/webhook-deliveries";
import { cookies, headers } from "next/headers";
import { notFound, redirect, forbidden } from "next/navigation";
import { getIdentityEnv } from "@vibe/config/env";
import { resolveTenant, canAccessProject } from "@vibe/auth";
import { ChartWidget } from "@vibe/ui";
import { PanelShell } from "../../components/panels/shell";
import { ResourceDetail } from "../../components/resources/detail";
import { ResourceForm } from "../../components/resources/form";
import { ResourceList } from "../../components/resources/list";
import { buildPanelPath, resolvePanelPath } from "../../lib/panels/routing";
import { loadGlobalMetrics, loadOrganizationOptions, loadProjectMetrics } from "../../lib/metrics/loaders";
import { listProjects, listTasks, getProject, getTask, listAuthorizedProjects } from "../../lib/resources/queries";
import { pageSession } from "../../lib/identity-session";
import { messages, type Locale } from "../../lib/i18n";
import { saveResource, removeResource, removeResources } from "../../lib/resources/panel-actions";
import { getPanelResource, resourcesForPanel } from "../../lib/panels/resources";
import { Attachments } from "../../components/resources/attachments";
import { AiAssistant } from "../../components/ai-assistant";


function authError(error: unknown): never {
  if (error instanceof Error && error.message === "UNAUTHORIZED") redirect("/login");
  if (error instanceof Error && error.message === "NOT_FOUND") notFound();
  if (error instanceof Error && error.message === "FORBIDDEN") forbidden();
  throw error;
}

export default async function PanelPage({ params, searchParams }: { params: Promise<{ segments: string[] }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { segments } = await params;
  const resolved = resolvePanelPath(`/${segments.map(encodeURIComponent).join("/")}`);
  if (!resolved) notFound();
  let session;
  try { ({ session } = await pageSession()); } catch (error) { if (error instanceof Error && error.message === "UNAUTHORIZED") redirect("/login"); throw error; }
  const { panel, tenantParam, segments: route } = resolved;
  const organizationContext = panel.context === "organization";
  if (panel.context === "global" && session.user.role !== "admin") forbidden();
  if (organizationContext && getIdentityEnv().IDENTITY_PROFILE === "personal") notFound();
  let tenant: { id: string; name: string; slug: string; role: string } | undefined;
  if (organizationContext) {
    try { tenant = await resolveTenant(tenantParam!, await headers(), panel.tenantIdentifier); } catch (error) { return authError(error); }
  }
  const identifier = tenant?.slug ?? null;
  const basePath = organizationContext ? buildPanelPath(panel.id, { tenant: tenantParam! }) : panel.prefix;
  const orgs = organizationContext || panel.context === "personal" ? await loadOrganizationOptions(panel.tenantIdentifier ?? "slug") : [];
  const orgOptions = orgs.map((org) => ({ id: org.id, name: org.name, href: buildPanelPath("organization", { tenant: org.identifier }) }));
  const cookieStore = await cookies();
  const rawLocale = cookieStore.get("locale")?.value;
  const locale: Locale = rawLocale === "en" ? "en" : "pt-BR";
  const path = route;
  const query = await searchParams;
  const resource = getPanelResource(panel.id, path[0]);
  if (path.length && !resource) notFound();
  const kind = path[0] === "projects" || path[0] === "tasks" ? path[0] : undefined;
  const action = path.length === 2 && path[1] === "new" ? "new" : path.length === 3 && path[2] === "edit" ? "edit" : path.length === 2 ? "detail" : path.length === 1 ? "list" : "invalid";
  let content;
  if (resource?.kind === "custom") {
    try { content = await resource.render({ panel, identifier, basePath, route: path, query, role: tenant?.role ?? "owner", locale }); }
    catch (error) { return authError(error); }
  } else if (panel.context === "global") {
    if (path.length) notFound();
    const metrics = await loadGlobalMetrics();
    content = <section className="space-y-3"><h2 className="text-xl font-semibold">{messages[locale].globalMetrics}</h2><p>{messages[locale].users}: {metrics.users}</p><p>{messages[locale].organizations}: {metrics.organizations}</p></section>;
  } else if (!kind && path.length === 0) {
    const data = await loadProjectMetrics(identifier);
    content = <ChartWidget title={messages[locale].createdProjects} description={messages[locale].projectsByMonth} data={data.some(point => point.total > 0) ? data.map(({ month, total }) => ({ label: month, value: total })) : []} seriesLabel={messages[locale].projectsSeries} emptyMessage={messages[locale].noProjects} />;
  } else {
    if (!kind || action === "invalid") notFound();
    const base = `${basePath}/${kind}`;
    const role = tenant?.role ?? "owner";
    const can = (operation: "read" | "create" | "update" | "delete") => panel.context === "personal" || canAccessProject(role, operation);
    const perms = { create: can("create"), update: can("update"), delete: can("delete"), bulkDelete: can("delete") };
    if (action === "list") {
      const input = { page: query.page, search: query.search, sort: query.sort, direction: query.direction };
      const result = kind === "projects" ? await listProjects(identifier, input) : await listTasks(identifier, input);
      content = <ResourceList locale={locale} kind={kind} rows={result.items.map(row => ({ ...row, createdAt: row.createdAt.toISOString() }))} rowCount={result.total} page={result.page} sort={typeof query.sort === "string" ? query.sort : "createdAt"} basePath={base} tenantIdentifier={identifier} permissions={perms} onDelete={removeResource.bind(null, panel.id, kind, identifier)} onBulkDelete={removeResources.bind(null, panel.id, kind, identifier)} />;
    } else if (action === "new" || action === "edit") {
      if (action === "new" && !perms.create || action === "edit" && !perms.update) forbidden();
      let row;
      if (action === "edit") { row = kind === "projects" ? await getProject(identifier, path[1]) : await getTask(identifier, path[1]); if (!row) notFound(); }
      let options: { id: string; name: string }[] = [];
      if (kind === "tasks") options = await listAuthorizedProjects(identifier, { search: typeof query.projectSearch === "string" ? query.projectSearch : "" });
      const initialValues = !row ? {} : "name" in row ? { name: row.name, description: row.description } : { title: row.title, projectId: row.projectId };
      content = <ResourceForm locale={locale} kind={kind} basePath={base} cancelHref={base} initialValues={initialValues} projects={options} onSave={saveResource.bind(null, panel.id, kind, identifier, action === "edit" ? path[1] : undefined)} />;
    } else {
      const row = kind === "projects" ? await getProject(identifier, path[1]) : await getTask(identifier, path[1]);
      if (!row) notFound();
      content = <><ResourceDetail locale={locale} kind={kind} row={{ ...row, createdAt: row.createdAt.toISOString() }} basePath={base} permissions={perms} onDelete={removeResource.bind(null, panel.id, kind, identifier)} />{kind === "projects" && process.env.STORAGE_ENABLED === "true" && <Attachments projectId={row.id} tenantIdentifier={identifier} />}</>;
    }
  }
  if (panel.context !== "global" && path.length === 0 && process.env.WEBHOOKS_OUTBOUND_ENABLED === "true") content = <>{content}<WebhookDeliveries tenantIdentifier={identifier} locale={locale} /></>;
  const nav = [{ label: messages[locale].overview, href: basePath }, ...resourcesForPanel(panel.id).map(resource => ({ label: resource.id === "projects" ? messages[locale].projects : resource.id === "tasks" ? messages[locale].tasks : resource.label, href: `${basePath}/${resource.id}` }))];
  return <PanelShell title={tenant?.name ?? panel.label} nav={nav} orgOptions={orgOptions} currentOrg={tenant ? { id: tenant.id, name: tenant.name } : undefined} user={{ name: session.user.name, email: session.user.email }} locale={locale} theme={cookieStore.get("theme")?.value === "dark" ? "dark" : "light"} initialCollapsed={cookieStore.get("sidebar:state")?.value === "collapsed"} tenantIdentifier={identifier} showNotifications={process.env.JOBS_ENABLED === "true"}>{content}{panel.context !== "global" && <AiAssistant key={identifier ?? "personal"} enabled={process.env.AI_ENABLED === "true"} tenantIdentifier={identifier} locale={locale} />}</PanelShell>;
}
