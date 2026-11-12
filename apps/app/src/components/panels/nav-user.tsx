"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTheme } from "next-themes";
import { BadgeCheck, ChevronsUpDown, Languages, LogOut, Monitor, Moon, ShieldCheck, Sun } from "lucide-react";
import { toast } from "sonner";
import { authClient } from "@vibe/auth/client";
import { Avatar, AvatarFallback } from "@vibe/ui/components/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from "@vibe/ui/components/dropdown-menu";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@vibe/ui/components/sidebar";
import type { Locale, messages } from "../../lib/i18n";

function initials(name: string) { return name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]!.toUpperCase()).join("") || "?"; }

/** User menu with account, appearance, language and sign-out (Filament user menu). Adapted from shadcn/ui sidebar-07 (MIT). */
export function NavUser({ user, locale, copy }: { user: { name: string; email?: string }; locale: Locale; copy: (typeof messages)[Locale] }) {
  const { isMobile } = useSidebar();
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  async function signOut() {
    setPending(true);
    try { const result = await authClient.signOut(); if (result.error) throw new Error("SIGN_OUT_FAILED"); window.location.assign("/login"); }
    catch { toast.error(copy.signOutError); setPending(false); }
  }
  function changeLocale(next: string) {
    document.cookie = `locale=${encodeURIComponent(next)}; Path=/; Max-Age=31536000; SameSite=Lax`;
    router.refresh();
  }
  const identity = <><Avatar className="size-8 rounded-lg"><AvatarFallback className="rounded-lg">{initials(user.name)}</AvatarFallback></Avatar><div className="grid flex-1 text-left text-sm leading-tight"><span className="truncate font-medium">{user.name}</span>{user.email && <span className="truncate text-xs text-muted-foreground">{user.email}</span>}</div></>;
  return <SidebarMenu><SidebarMenuItem><DropdownMenu>
    <DropdownMenuTrigger render={<SidebarMenuButton size="lg" className="data-popup-open:bg-sidebar-accent data-popup-open:text-sidebar-accent-foreground" />}>{identity}<ChevronsUpDown className="ml-auto size-4" /></DropdownMenuTrigger>
    <DropdownMenuContent className="min-w-56" side={isMobile ? "bottom" : "right"} align="end" sideOffset={4}>
      <DropdownMenuGroup><DropdownMenuLabel className="p-0 font-normal"><div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">{identity}</div></DropdownMenuLabel></DropdownMenuGroup>
      <DropdownMenuSeparator />
      <DropdownMenuGroup>
        <DropdownMenuItem render={<Link href="/account" />}><BadgeCheck />{copy.account}</DropdownMenuItem>
        <DropdownMenuItem render={<Link href="/security" />}><ShieldCheck />{copy.security}</DropdownMenuItem>
      </DropdownMenuGroup>
      <DropdownMenuSeparator />
      <DropdownMenuGroup>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger><Sun />{copy.appearance}</DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuRadioGroup value={theme ?? "system"} onValueChange={value => setTheme(String(value))}>
              <DropdownMenuRadioItem value="light"><Sun />{copy.light}</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="dark"><Moon />{copy.dark}</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="system"><Monitor />{copy.system}</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger><Languages />{copy.language}</DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuRadioGroup value={locale} onValueChange={value => changeLocale(String(value))}>
              <DropdownMenuRadioItem value="pt-BR">Português</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="en">English</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </DropdownMenuGroup>
      <DropdownMenuSeparator />
      <DropdownMenuGroup><DropdownMenuItem variant="destructive" disabled={pending} onClick={() => void signOut()}><LogOut />{copy.signOut}</DropdownMenuItem></DropdownMenuGroup>
    </DropdownMenuContent>
  </DropdownMenu></SidebarMenuItem></SidebarMenu>;
}
