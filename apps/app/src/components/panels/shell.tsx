"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Building2, LayoutDashboard, ListTodo, Moon, Sun, FolderKanban, type LucideIcon } from "lucide-react";
import { Button } from "@vibe/ui/components/button";
import { NativeSelect, NativeSelectOption } from "@vibe/ui/components/native-select";
import { Separator } from "@vibe/ui/components/separator";
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarInset, SidebarProvider, SidebarRail, SidebarTrigger } from "@vibe/ui/components/sidebar";
import { Notifications } from "../notifications";
import { messages, type Locale } from "../../lib/i18n";
import { NavMain } from "./nav-main";
import { NavUser } from "./nav-user";
import { TeamSwitcher } from "./team-switcher";

export type PanelShellProps = {
  title: string;
  nav: readonly { label: string; href: string }[];
  orgOptions: readonly { id: string; name: string; href: string }[];
  currentOrg?: { id: string; name: string };
  user: { name: string; email?: string };
  children: ReactNode;
  locale?: Locale;
  theme?: "light" | "dark";
  initialCollapsed?: boolean;
  showNotifications?: boolean;
  tenantIdentifier?: string | null;
};

function saveCookie(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

function iconFor(href: string, index: number): LucideIcon {
  if (index === 0) return LayoutDashboard;
  if (href.endsWith("/projects")) return FolderKanban;
  if (href.endsWith("/tasks")) return ListTodo;
  return Building2;
}

/** Panel layout adapted from shadcn/ui block sidebar-07 (MIT). */
export function PanelShell({ title, nav, orgOptions, currentOrg, user, children, locale = "pt-BR", theme = "light", initialCollapsed = false, showNotifications = false, tenantIdentifier = null }: PanelShellProps) {
  const router = useRouter();
  const [currentTheme, setCurrentTheme] = useState(theme);
  const [currentLocale, setCurrentLocale] = useState(locale);
  const copy = messages[currentLocale];
  const pathname = usePathname();
  const current = [...nav].sort((a, b) => b.href.length - a.href.length).find(item => pathname === item.href || pathname.startsWith(item.href + "/"));

  function toggleTheme() {
    const next = currentTheme === "light" ? "dark" : "light";
    setCurrentTheme(next);
    document.documentElement.dataset.theme = next;
    saveCookie("theme", next);
  }

  function changeLocale(next: Locale) {
    setCurrentLocale(next);
    saveCookie("locale", next);
    router.refresh();
  }

  return <SidebarProvider defaultOpen={!initialCollapsed}>
    <Sidebar collapsible="icon" aria-label={copy.navigation}>
      <SidebarHeader><TeamSwitcher title={title} current={currentOrg} options={orgOptions} label={copy.organizations} manageLabel={copy.organizations} /></SidebarHeader>
      <SidebarContent><NavMain label={copy.navigation} items={nav.map((item, index) => ({ title: item.label, url: item.href, icon: iconFor(item.href, index) }))} /></SidebarContent>
      <SidebarFooter><NavUser user={user} copy={copy} /></SidebarFooter>
      <SidebarRail />
    </Sidebar>
    <SidebarInset>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
        <div className="flex flex-1 items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" aria-label={copy.collapseSidebar} />
          <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
          <span className="truncate text-sm font-medium">{current?.label ?? title}</span>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="ghost" size="icon" aria-label={copy.theme} onClick={toggleTheme}>{currentTheme === "dark" ? <Sun /> : <Moon />}</Button>
            <label className="sr-only" htmlFor="panel-locale">{copy.language}</label>
            <NativeSelect id="panel-locale" size="sm" value={currentLocale} onChange={event => changeLocale(event.target.value as Locale)}>
              <NativeSelectOption value="pt-BR">Português</NativeSelectOption>
              <NativeSelectOption value="en">English</NativeSelectOption>
            </NativeSelect>
          </div>
        </div>
      </header>
      <main className="flex flex-1 flex-col gap-6 p-4 md:p-6">{showNotifications && <Notifications key={tenantIdentifier ?? "personal"} tenantIdentifier={tenantIdentifier} locale={currentLocale} />}{children}</main>
    </SidebarInset>
  </SidebarProvider>;
}
