"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@vibe/ui/components/sidebar";
import { navIcons, type NavIcon } from "./nav-icons";

export type NavItem = { title: string; href: string; icon: NavIcon; exact?: boolean };
export type NavGroup = { label: string; items: NavItem[] };

/** Grouped navigation (Filament navigation groups). Adapted from shadcn/ui sidebar-07 (MIT). */
export function NavMain({ groups }: { groups: NavGroup[] }) {
  const pathname = usePathname();
  const active = (item: NavItem) => item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
  return <>{groups.map(group => <SidebarGroup key={group.label}>
    <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
    <SidebarMenu>
      {group.items.map(item => { const Icon = navIcons[item.icon]; return <SidebarMenuItem key={item.href}>
        <SidebarMenuButton tooltip={item.title} isActive={active(item)} render={<Link href={item.href} aria-current={active(item) ? "page" : undefined} />}><Icon /><span>{item.title}</span></SidebarMenuButton>
      </SidebarMenuItem>; })}
    </SidebarMenu>
  </SidebarGroup>)}</>;
}
