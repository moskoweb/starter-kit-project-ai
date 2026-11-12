"use client";

import Link from "next/link";
import { Building2, Check, ChevronsUpDown, Settings2, UserRound } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@vibe/ui/components/dropdown-menu";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@vibe/ui/components/sidebar";

export type Workspace = { id: string; name: string; href: string };

/** Tenant switcher (Filament tenancy menu). Adapted from shadcn/ui sidebar-07 (MIT). */
export function TeamSwitcher({ title, subtitle, currentId, personal, organizations, labels }: { title: string; subtitle: string; currentId: string | null; personal?: Workspace; organizations: readonly Workspace[]; labels: { workspace: string; organizations: string; manage: string } }) {
  const { isMobile } = useSidebar();
  return <SidebarMenu><SidebarMenuItem><DropdownMenu>
    <DropdownMenuTrigger render={<SidebarMenuButton size="lg" className="data-popup-open:bg-sidebar-accent data-popup-open:text-sidebar-accent-foreground" />}>
      <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">{currentId ? <Building2 className="size-4" /> : <UserRound className="size-4" />}</div>
      <div className="grid flex-1 text-left text-sm leading-tight"><span className="truncate font-medium">{title}</span><span className="truncate text-xs text-muted-foreground">{subtitle}</span></div>
      <ChevronsUpDown className="ml-auto" />
    </DropdownMenuTrigger>
    <DropdownMenuContent className="min-w-56" align="start" side={isMobile ? "bottom" : "right"} sideOffset={4}>
      <DropdownMenuGroup>
        <DropdownMenuLabel className="text-xs text-muted-foreground">{labels.workspace}</DropdownMenuLabel>
        {personal && <DropdownMenuItem render={<Link href={personal.href} />} className="gap-2 p-2"><div className="flex size-6 items-center justify-center rounded-md border"><UserRound className="size-3.5" /></div>{personal.name}{currentId === null && <Check className="ml-auto" />}</DropdownMenuItem>}
      </DropdownMenuGroup>
      {organizations.length > 0 && <DropdownMenuGroup>
        <DropdownMenuLabel className="text-xs text-muted-foreground">{labels.organizations}</DropdownMenuLabel>
        {organizations.map(org => <DropdownMenuItem key={org.id} render={<Link href={org.href} />} className="gap-2 p-2"><div className="flex size-6 items-center justify-center rounded-md border"><Building2 className="size-3.5" /></div><span className="truncate">{org.name}</span>{currentId === org.id && <Check className="ml-auto" />}</DropdownMenuItem>)}
      </DropdownMenuGroup>}
      <DropdownMenuSeparator />
      <DropdownMenuGroup>
        <DropdownMenuItem render={<Link href="/organizations" />} className="gap-2 p-2"><div className="flex size-6 items-center justify-center rounded-md border"><Settings2 className="size-3.5" /></div><span className="text-muted-foreground">{labels.manage}</span></DropdownMenuItem>
      </DropdownMenuGroup>
    </DropdownMenuContent>
  </DropdownMenu></SidebarMenuItem></SidebarMenu>;
}
