"use client";

import Link from "next/link";
import { useState } from "react";
import { BadgeCheck, ChevronsUpDown, LogOut, ShieldCheck } from "lucide-react";
import { authClient } from "@vibe/auth/client";
import { Avatar, AvatarFallback } from "@vibe/ui/components/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@vibe/ui/components/dropdown-menu";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@vibe/ui/components/sidebar";
import type { messages, Locale } from "../../lib/i18n";

function initials(name: string) { return name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]!.toUpperCase()).join("") || "?"; }

/** Adapted from shadcn/ui block sidebar-07 (MIT). */
export function NavUser({ user, copy }: { user: { name: string; email?: string }; copy: (typeof messages)[Locale] }) {
  const { isMobile } = useSidebar();
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  async function signOut() {
    setPending(true); setFailed(false);
    try { const result = await authClient.signOut(); if (result.error) throw new Error("SIGN_OUT_FAILED"); window.location.assign("/login"); }
    catch { setFailed(true); setPending(false); }
  }
  const identity = <><Avatar className="h-8 w-8 rounded-lg"><AvatarFallback className="rounded-lg">{initials(user.name)}</AvatarFallback></Avatar><div className="grid flex-1 text-left text-sm leading-tight"><span className="truncate font-medium">{user.name}</span>{user.email && <span className="truncate text-xs">{user.email}</span>}</div></>;
  return <SidebarMenu><SidebarMenuItem>
    <DropdownMenu>
      <DropdownMenuTrigger asChild><SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">{identity}<ChevronsUpDown className="ml-auto size-4" /></SidebarMenuButton></DropdownMenuTrigger>
      <DropdownMenuContent className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg" side={isMobile ? "bottom" : "right"} align="end" sideOffset={4}>
        <DropdownMenuLabel className="p-0 font-normal"><div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">{identity}</div></DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild><Link href="/account"><BadgeCheck />{copy.account}</Link></DropdownMenuItem>
          <DropdownMenuItem asChild><Link href="/security"><ShieldCheck />{copy.security}</Link></DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled={pending} onSelect={event => { event.preventDefault(); void signOut(); }}><LogOut />{copy.signOut}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
    {failed && <p role="alert" className="px-2 text-xs text-destructive">{copy.signOutError}</p>}
  </SidebarMenuItem></SidebarMenu>;
}
