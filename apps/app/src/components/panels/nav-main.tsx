"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@vibe/ui/components/sidebar";

/** Adapted from shadcn/ui block sidebar-07 (MIT). */
export function NavMain({ label, items }: { label: string; items: readonly { title: string; url: string; icon: LucideIcon }[] }) {
  const pathname = usePathname();
  return <SidebarGroup><SidebarGroupLabel>{label}</SidebarGroupLabel><SidebarMenu>
    {items.map(item => <SidebarMenuItem key={item.url}><SidebarMenuButton asChild tooltip={item.title} isActive={pathname === item.url}><Link href={item.url} aria-current={pathname === item.url ? "page" : undefined}><item.icon /><span>{item.title}</span></Link></SidebarMenuButton></SidebarMenuItem>)}
  </SidebarMenu></SidebarGroup>;
}
