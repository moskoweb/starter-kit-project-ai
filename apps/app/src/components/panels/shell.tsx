import type { ReactNode } from "react";
import { Separator } from "@vibe/ui/components/separator";
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarInset, SidebarProvider, SidebarRail, SidebarTrigger } from "@vibe/ui/components/sidebar";
import { Notifications } from "../notifications";
import { messages, type Locale } from "../../lib/i18n";
import { GlobalSearch } from "./global-search";
import { PanelBreadcrumbs } from "./breadcrumbs";
import { ImpersonationBanner } from "./impersonation-banner";
import { NavMain, type NavGroup } from "./nav-main";
import { NavUser } from "./nav-user";
import { TeamSwitcher, type Workspace } from "./team-switcher";

export type PanelShellProps = {
  title: string;
  subtitle: string;
  groups: NavGroup[];
  currentWorkspaceId: string | null;
  /** False in single mode or without workspace panels: fixed header, no workspace menu. */
  switchable: boolean;
  personal?: Workspace;
  organizations: readonly Workspace[];
  user: { name: string; email?: string };
  children: ReactNode;
  locale: Locale;
  initialCollapsed?: boolean;
  persistent?: boolean;
  showNotifications?: boolean;
  tenantIdentifier?: string | null;
};

/** shadcn/ui sidebar-07 (MIT), adapted to registered panels and real workspace/user data. */
export function PanelShell({ title, subtitle, groups, currentWorkspaceId, switchable, personal, organizations, user, children, locale, initialCollapsed = false, persistent = false, showNotifications = false, tenantIdentifier = null }: PanelShellProps) {
  const copy = messages[locale];
  const shell = <>
    <Sidebar collapsible="icon">
      <SidebarHeader><TeamSwitcher title={title} subtitle={subtitle} currentId={currentWorkspaceId} switchable={switchable} personal={personal} organizations={organizations} labels={{ workspace: copy.workspace, organizations: copy.organizations, manage: copy.manageOrganizations }} /></SidebarHeader>
      <SidebarContent><NavMain groups={groups} /></SidebarContent>
      <SidebarFooter><NavUser user={user} locale={locale} copy={copy} /></SidebarFooter>
      <SidebarRail />
    </Sidebar>
    <SidebarInset>
      <ImpersonationBanner locale={locale} />
      <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur transition-[width,height] ease-linear supports-backdrop-filter:bg-background/60 group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
        <SidebarTrigger className="-ml-1" aria-label={copy.collapseSidebar} />
        <Separator orientation="vertical" className="mr-1 data-vertical:h-4" />
        <PanelBreadcrumbs title={title} groups={groups} />
        <div className="ml-auto flex items-center gap-1">
          <GlobalSearch groups={groups} labels={{ search: copy.search, placeholder: copy.commandPlaceholder, empty: copy.noResults }} />
          {showNotifications && <Notifications key={tenantIdentifier ?? "personal"} tenantIdentifier={tenantIdentifier} locale={locale} />}
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 p-4 md:p-8">{children}</main>
    </SidebarInset>
  </>;
  return persistent ? shell : <SidebarProvider defaultOpen={!initialCollapsed}>{shell}</SidebarProvider>;
}
