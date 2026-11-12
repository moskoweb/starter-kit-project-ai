import type { ReactNode } from "react";
import { PanelShell } from "@/components/panels/shell";
import { accountChrome } from "@/lib/panels/chrome";
import { pageSession } from "@/lib/identity-session";

/** Account, security and organization pages share the panel shell (Filament profile/tenancy pages). */
export default async function AccountLayout({ children }: { children: ReactNode }) {
  const { session } = await pageSession();
  const chrome = await accountChrome({ name: session.user.name, email: session.user.email });
  return <PanelShell {...chrome} showNotifications={process.env.JOBS_ENABLED === "true"}>{children}</PanelShell>;
}
