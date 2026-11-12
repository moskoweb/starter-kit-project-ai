import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound, redirect, forbidden } from "next/navigation";
import { Building2, FolderKanban, ListTodo, TrendingUp, Users } from "lucide-react";
import { getIdentityEnv } from "@vibe/config/env";
import { resolveTenant } from "@vibe/auth";
import { PageHeader } from "@vibe/ui/components/resource/page-header";
import { ChartWidget } from "@vibe/ui/components/widgets/chart-widget";
import { StatsOverview } from "@vibe/ui/components/widgets/stats-overview";
import { PanelShell } from "../../components/panels/shell";
import { PushSettings } from "../../components/push-settings";
import { WebhookDeliveries } from "../../components/webhook-deliveries";
import { AiAssistant } from "../../components/ai-assistant";
import { Attachments } from "../../components/resources/attachments";
import { buildPanelPath, resolvePanelPath } from "../../lib/panels/routing";
import { getPanelResource } from "../../lib/panels/resources";
import { currentLocale, panelChrome } from "../../lib/panels/chrome";
import { loadGlobalMetrics, loadProjectMetrics, loadWorkspaceStats } from "../../lib/metrics/loaders";
import { pageSession } from "../../lib/identity-session";
import { messages } from "../../lib/i18n";
import { t } from "../../lib/resources/define";
import { renderResource } from "../../lib/resources/render";

type Props = { params: Promise<{ segments: string[] }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

function authError(error: unknown): never {
  if (error instanceof Error && error.message === "UNAUTHORIZED") redirect("/login");
  if (error instanceof Error && error.message === "NOT_FOUND") notFound();
  if (error instanceof Error && error.message === "FORBIDDEN") forbidden();
  throw error;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { segments } = await params;
  const resolved = resolvePanelPath(`/${segments.map(encodeURIComponent).join("/")}`);
  const entry = resolved && getPanelResource(resolved.panel.id, resolved.segments[0]);
  const locale = await currentLocale();
  return { title: entry?.kind === "resource" ? t(entry.definition.pluralLabel, locale) : entry?.kind === "custom" ? entry.label : messages[locale].dashboard };
}

export default async function PanelPage({ params, searchParams }: Props) {
  const { segments } = await params;
  const resolved = resolvePanelPath(`/${segments.map(encodeURIComponent).join("/")}`);
  if (!resolved) notFound();
  const { session } = await pageSession();
  const { panel, tenantParam, segments: route } = resolved;
  const organizationContext = panel.context === "organization";
  if (panel.context === "global" && session.user.role !== "admin") forbidden();
  if (organizationContext && getIdentityEnv().IDENTITY_PROFILE === "personal") notFound();
  let tenant: { id: string; name: string; slug: string; role: string } | undefined;
  if (organizationContext) {
    try { tenant = await resolveTenant(tenantParam!, await headers(), panel.tenantIdentifier); } catch (error) { return authError(error); }
  }
  const identifier = tenant?.slug ?? null;
  const scope = { identifier, role: tenant?.role ?? null };
  const basePath = organizationContext ? buildPanelPath(panel.id, { tenant: tenantParam! }) : panel.prefix;
  const locale = await currentLocale();
  const copy = messages[locale];
  const query = await searchParams;
  const panelTitle = tenant?.name ?? (panel.context === "personal" ? copy.personal : panel.label);

  const entry = getPanelResource(panel.id, route[0]);
  if (route.length && !entry) notFound();
  let content;
  try {
    if (entry?.kind === "resource") content = await renderResource(entry.definition, { panel, panelTitle, basePath, route, query, scope, locale });
    else if (entry?.kind === "custom") content = await entry.render({ panel, identifier, basePath, route, query, role: tenant?.role ?? "owner", locale });
    else if (panel.context === "global") {
      const metrics = await loadGlobalMetrics();
      const format = new Intl.NumberFormat(locale);
      content = <>
        <PageHeader title={copy.dashboard} description={copy.globalMetrics} />
        <StatsOverview stats={[{ label: copy.users, value: format.format(metrics.users), icon: <Users className="size-4" /> }, { label: copy.organizations, value: format.format(metrics.organizations), icon: <Building2 className="size-4" /> }]} />
      </>;
    } else {
      const [stats, monthly] = await Promise.all([loadWorkspaceStats(identifier), loadProjectMetrics(identifier)]);
      const format = new Intl.NumberFormat(locale);
      content = <>
        <PageHeader title={`${copy.welcome}, ${session.user.name.split(" ")[0]}`} description={copy.dashboardDescription} />
        <StatsOverview stats={[
          { label: copy.totalProjects, value: format.format(stats.projectCount), icon: <FolderKanban className="size-4" /> },
          { label: copy.totalTasks, value: format.format(stats.taskCount), icon: <ListTodo className="size-4" /> },
          { label: `${copy.projects} · ${copy.thisMonth}`, value: format.format(stats.projectsThisMonth), icon: <TrendingUp className="size-4" /> },
        ]} />
        <ChartWidget title={copy.createdProjects} description={copy.projectsByMonth} data={monthly.some(point => point.total > 0) ? monthly.map(({ month, total }) => ({ label: month, value: total })) : []} seriesLabel={copy.projectsSeries} emptyMessage={copy.noProjects} />
        {process.env.WEBHOOKS_OUTBOUND_ENABLED === "true" && <WebhookDeliveries tenantIdentifier={identifier} locale={locale} />}
        {process.env.PUSH_ENABLED === "true" && <PushSettings key={identifier ?? "personal"} enabled tenantIdentifier={identifier} locale={locale} />}
      </>;
    }
  } catch (error) { return authError(error); }

  if (entry?.kind === "resource" && entry.definition.slug === "projects" && route.length === 2 && route[1] !== "new" && process.env.STORAGE_ENABLED === "true") {
    content = <>{content}<Attachments key={`${identifier ?? "personal"}:${route[1]}`} projectId={route[1]!} tenantIdentifier={identifier} locale={locale} /></>;
  }

  const chrome = await panelChrome({ panel, basePath, tenant, user: { name: session.user.name, email: session.user.email }, locale });

  return <PanelShell {...chrome} tenantIdentifier={identifier} showNotifications={process.env.JOBS_ENABLED === "true"}>
    {content}
    {panel.context !== "global" && route.length === 0 && <AiAssistant key={identifier ?? "personal"} enabled={process.env.AI_ENABLED === "true"} tenantIdentifier={identifier} locale={locale} />}
  </PanelShell>;
}
