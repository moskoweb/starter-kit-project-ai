import type { Metadata } from "next";
import type { ReactNode } from "react";
import { headers } from "next/headers";
import { notFound, redirect, forbidden } from "next/navigation";
import { Ban, Building2, LayoutDashboard, UserPlus, Users } from "lucide-react";
import { getIdentityEnv } from "@vibe/config/env";
import { resolveTenant } from "@vibe/auth";
import { loadAdminUserStats } from "../../lib/resources/definitions/admin-users";
import { PageHeader } from "@vibe/ui/components/resource/page-header";
import { Avatar, AvatarFallback } from "@vibe/ui/components/avatar";
import { Card, CardContent } from "@vibe/ui/components/card";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@vibe/ui/components/empty";
import { StatsOverview } from "@vibe/ui/components/widgets/stats-overview";
import { SignOut } from "../../components/identity/sign-out";
import { PanelShell } from "../../components/panels/shell";
import { PushSettings } from "../../components/push-settings";
import { WebhookDeliveries } from "../../components/webhook-deliveries";
import { AiAssistant } from "../../components/ai-assistant";
import { buildPanelPath, resolvePanelPath } from "../../lib/panels/routing";
import { getPanelResource } from "../../lib/panels/resources";
import { currentLocale, panelChrome } from "../../lib/panels/chrome";
import { loadGlobalMetrics } from "../../lib/metrics/loaders";
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
  const scope = { identifier, role: tenant?.role ?? null, userId: session.user.id, isAdmin: panel.context === "global" && session.user.role === "admin" };
  const basePath = organizationContext ? buildPanelPath(panel.id, { tenant: tenantParam! }) : panel.prefix;
  const locale = await currentLocale();
  const copy = messages[locale];
  const query = await searchParams;
  const panelTitle = tenant?.name ?? (panel.context === "personal" ? copy.personal : panel.label);

  const entry = getPanelResource(panel.id, route[0]);
  if (route.length && !entry) notFound();
  type Loaded =
    | { kind: "node"; node: ReactNode }
    | { kind: "global"; metrics: Awaited<ReturnType<typeof loadGlobalMetrics>>; admin: Awaited<ReturnType<typeof loadAdminUserStats>> }
    | { kind: "workspace" };
  let loaded: Loaded;
  try {
    if (entry?.kind === "resource") loaded = { kind: "node", node: await renderResource(entry.definition, { panel, panelTitle, basePath, route, query, scope, locale }) };
    else if (entry?.kind === "custom") loaded = { kind: "node", node: await entry.render({ panel, identifier, basePath, route, query, role: tenant?.role ?? "owner", locale }) };
    else if (panel.context === "global") { const [metrics, admin] = await Promise.all([loadGlobalMetrics(), loadAdminUserStats()]); loaded = { kind: "global", metrics, admin }; }
    else loaded = { kind: "workspace" };
  } catch (error) { return authError(error); }

  const format = new Intl.NumberFormat(locale);
  let content;
  if (loaded.kind === "node") content = loaded.node;
  else if (loaded.kind === "global") {
    const { metrics, admin } = loaded;
    const extra = locale === "en" ? { signups: "New users · 30 days", banned: "Banned users" } : { signups: "Novos usuários · 30 dias", banned: "Usuários banidos" };
    content = <>
      <PageHeader title={copy.dashboard} description={copy.globalMetrics} />
      <StatsOverview stats={[
        { label: copy.users, value: format.format(metrics.users), icon: <Users className="size-4" /> },
        { label: copy.organizations, value: format.format(metrics.organizations), icon: <Building2 className="size-4" /> },
        { label: extra.signups, value: format.format(admin.recent), icon: <UserPlus className="size-4" /> },
        { label: extra.banned, value: format.format(admin.banned), icon: <Ban className="size-4" /> },
      ]} />
    </>;
  } else {
    const initials = session.user.name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]!.toUpperCase()).join("") || "?";
    content = <>
      <PageHeader title={`${copy.welcome}, ${session.user.name.split(" ")[0]}`} description={copy.dashboardDescription} />
      <Card>
        <CardContent className="flex flex-wrap items-center gap-4">
          <Avatar className="size-10"><AvatarFallback>{initials}</AvatarFallback></Avatar>
          <div className="grid min-w-0 flex-1 leading-tight"><span className="truncate font-medium">{session.user.name}</span><span className="truncate text-sm text-muted-foreground">{session.user.email}</span></div>
          <SignOut locale={locale} />
        </CardContent>
      </Card>
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon"><LayoutDashboard /></EmptyMedia>
          <EmptyTitle>{copy.emptyDashboard}</EmptyTitle>
          <EmptyDescription>{copy.emptyDashboardDescription}</EmptyDescription>
        </EmptyHeader>
        {process.env.NODE_ENV !== "production" && <EmptyContent><p className="text-sm text-muted-foreground">{copy.emptyDashboardHint} <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">pnpm exec tsx packages/cli/src/index.ts resource</code></p></EmptyContent>}
      </Empty>
      {process.env.WEBHOOKS_OUTBOUND_ENABLED === "true" && <WebhookDeliveries tenantIdentifier={identifier} locale={locale} />}
      {process.env.PUSH_ENABLED === "true" && <PushSettings key={identifier ?? "personal"} enabled tenantIdentifier={identifier} locale={locale} />}
    </>;
  }

  const chrome = await panelChrome({ panel, basePath, tenant, user: { name: session.user.name, email: session.user.email }, locale });

  return <PanelShell {...chrome} tenantIdentifier={identifier} showNotifications={process.env.JOBS_ENABLED === "true"}>
    {content}
    {panel.context !== "global" && route.length === 0 && <AiAssistant key={identifier ?? "personal"} enabled={process.env.AI_ENABLED === "true"} tenantIdentifier={identifier} locale={locale} />}
  </PanelShell>;
}
