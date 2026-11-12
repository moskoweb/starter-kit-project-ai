import { Building2, FolderKanban, LayoutDashboard, ListTodo, Settings, ShieldCheck, UserRound, Users, type LucideIcon } from "lucide-react";

/** Server components pass icon names; client resolves them (components are not serializable). */
export const navIcons = { dashboard: LayoutDashboard, projects: FolderKanban, tasks: ListTodo, organization: Building2, users: Users, settings: Settings, account: UserRound, security: ShieldCheck } satisfies Record<string, LucideIcon>;
export type NavIcon = keyof typeof navIcons;
