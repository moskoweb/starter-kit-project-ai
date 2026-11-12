"use client";

import Link from "next/link";
import { Building2, ChevronsUpDown, Plus } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@vibe/ui/components/dropdown-menu";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@vibe/ui/components/sidebar";

/** Adapted from shadcn/ui block sidebar-07 (MIT). */
export function TeamSwitcher({ title, current, options, label, manageLabel }: { title: string; current?: { name: string }; options: readonly { id: string; name: string; href: string }[]; label: string; manageLabel: string }) {
  const { isMobile } = useSidebar();
  return <SidebarMenu><SidebarMenuItem><DropdownMenu>
    <DropdownMenuTrigger asChild>
      <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
        <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground"><Building2 className="size-4" /></div>
        <div className="grid flex-1 text-left text-sm leading-tight"><span className="truncate font-medium">{title}</span>{current && current.name !== title && <span className="truncate text-xs">{current.name}</span>}</div>
        <ChevronsUpDown className="ml-auto" />
      </SidebarMenuButton>
    </DropdownMenuTrigger>
    <DropdownMenuContent className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg" align="start" side={isMobile ? "bottom" : "right"} sideOffset={4}>
      <DropdownMenuLabel className="text-xs text-muted-foreground">{label}</DropdownMenuLabel>
      {options.map(org => <DropdownMenuItem key={org.id} asChild className="gap-2 p-2"><Link href={org.href}><div className="flex size-6 items-center justify-center rounded-md border"><Building2 className="size-3.5 shrink-0" /></div>{org.name}</Link></DropdownMenuItem>)}
      <DropdownMenuSeparator />
      <DropdownMenuItem asChild className="gap-2 p-2"><Link href="/organizations"><div className="flex size-6 items-center justify-center rounded-md border bg-transparent"><Plus className="size-4" /></div><div className="font-medium text-muted-foreground">{manageLabel}</div></Link></DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu></SidebarMenuItem></SidebarMenu>;
}
