import { Ban, Building2, FolderKanban, LayoutDashboard, ListTodo, MonitorSmartphone, Settings, Shield, ShieldCheck, UserRound, UserRoundCog, Users, type LucideIcon } from "lucide-react";

/** Server components pass icon names; client resolves them (components are not serializable). Also used for record action icons. */
export const navIcons = { dashboard: LayoutDashboard, projects: FolderKanban, tasks: ListTodo, organization: Building2, users: Users, settings: Settings, account: UserRound, security: ShieldCheck, ban: Ban, impersonate: UserRoundCog, sessions: MonitorSmartphone, shield: Shield } satisfies Record<string, LucideIcon>;
export type NavIcon = keyof typeof navIcons;
