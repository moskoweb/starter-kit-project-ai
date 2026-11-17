import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { SidebarProvider } from "@vibe/ui/components/sidebar";

/** Stable route group preserves UI state across catch-all panel segments. No identity data is cached here. */
export default async function PanelsLayout({ children }: { children: ReactNode }) {
  const open = (await cookies()).get("sidebar_state")?.value !== "false";
  return <SidebarProvider defaultOpen={open}>{children}</SidebarProvider>;
}
