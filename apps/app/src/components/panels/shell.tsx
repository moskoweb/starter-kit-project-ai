"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { authClient } from "@vibe/auth/client";
import { Notifications } from "../notifications";
import { messages, type Locale } from "../../lib/i18n";

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

export function PanelShell({ title, nav, orgOptions, currentOrg, user, children, locale = "pt-BR", theme = "light", initialCollapsed = false, showNotifications = false, tenantIdentifier = null }: PanelShellProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(!initialCollapsed);
  const [currentTheme, setCurrentTheme] = useState(theme);
  const [currentLocale, setCurrentLocale] = useState(locale);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const copy = messages[currentLocale];

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (menuOpen && !dialog.open) dialog.showModal();
    if (!menuOpen && dialog.open) dialog.close();
  }, [menuOpen]);

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

  async function signOut() {
    setSigningOut(true);
    setSignOutError(false);
    try {
      const result = await authClient.signOut();
      if (result.error) throw new Error("SIGN_OUT_FAILED");
      window.location.assign("/login");
    } catch {
      setSignOutError(true);
      setSigningOut(false);
    }
  }

  function toggleSidebar() {
    setSidebarOpen((open) => {
      saveCookie("sidebar", open ? "collapsed" : "open");
      return !open;
    });
  }

  const sidebar = <>
    <h1 className="text-xl font-semibold">{title}</h1>
    {currentOrg && <p className="mt-4 text-sm">{currentOrg.name}</p>}
    {orgOptions.length > 0 && <nav className="mt-3" aria-label={copy.organizations}>{orgOptions.map((org) => <Link className="block rounded px-3 py-2 hover:bg-black/5 dark:hover:bg-white/10" key={org.id} href={org.href}>{org.name}</Link>)}</nav>}
    <nav className="mt-5 space-y-1" aria-label={copy.navigation}>{nav.map((item) => <Link className="block rounded px-3 py-2 hover:bg-black/5 dark:hover:bg-white/10" key={item.href} href={item.href}>{item.label}</Link>)}
      <Link className="block rounded px-3 py-2 hover:bg-black/5 dark:hover:bg-white/10" href="/account">{copy.account}</Link>
      <Link className="block rounded px-3 py-2 hover:bg-black/5 dark:hover:bg-white/10" href="/security">{copy.security}</Link>
      <Link className="block rounded px-3 py-2 hover:bg-black/5 dark:hover:bg-white/10" href="/organizations">{copy.organizations}</Link>
    </nav>
    <div className="mt-auto border-t border-black/10 pt-4 dark:border-white/10"><p className="font-medium">{user.name}</p>{user.email && <p className="text-sm text-gray-500">{user.email}</p>}<button disabled={signingOut} className="mt-3 underline disabled:opacity-50" onClick={signOut}>{copy.signOut}</button>{signOutError && <p role="alert">{copy.signOutError}</p>}</div>
  </>;

  return <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] md:flex">
    <aside className={`${sidebarOpen ? "hidden md:flex" : "hidden"} w-64 shrink-0 flex-col gap-4 border-r border-black/10 p-5 dark:border-white/10`}>{sidebar}</aside>
    <div className="min-w-0 flex-1"><header className="flex items-center justify-between gap-3 border-b border-black/10 p-4 dark:border-white/10">
      <button ref={triggerRef} className="rounded border px-3 py-2 md:hidden" aria-label={copy.openMenu} onClick={() => setMenuOpen(true)}>☰</button>
      <button className="hidden rounded border px-3 py-2 md:inline-flex" aria-label={copy.collapseSidebar} onClick={toggleSidebar}>☰</button>
      <div className="ml-auto flex items-center gap-3"><button className="rounded border px-3 py-2" onClick={toggleTheme}>{copy.theme}</button><label className="sr-only" htmlFor="panel-locale">{copy.language}</label><select id="panel-locale" className="rounded border bg-transparent p-2" value={currentLocale} onChange={(event) => changeLocale(event.target.value as Locale)}><option value="pt-BR">Português</option><option value="en">English</option></select></div>
    </header><main className="space-y-6 p-5 md:p-8">{showNotifications && <Notifications tenantIdentifier={tenantIdentifier} locale={currentLocale} />}{children}</main></div>
    <dialog ref={dialogRef} className="m-0 h-full max-h-full w-72 max-w-[85vw] bg-[var(--background)] p-5 text-[var(--foreground)] backdrop:bg-black/50" onCancel={(event) => { event.preventDefault(); setMenuOpen(false); }} onClose={() => { setMenuOpen(false); triggerRef.current?.focus(); }}><div className="flex h-full flex-col"><button className="mb-5 self-end rounded border px-3 py-2" onClick={() => setMenuOpen(false)}>{copy.closeMenu}</button>{sidebar}</div></dialog>
  </div>;
}
