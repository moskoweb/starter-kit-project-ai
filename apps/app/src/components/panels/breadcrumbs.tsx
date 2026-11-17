"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@vibe/ui/components/breadcrumb";
import type { NavGroup } from "./nav-main";

export function PanelBreadcrumbs({ title, groups }: { title: string; groups: NavGroup[] }) {
  const pathname = usePathname();
  const items = groups.flatMap(group => group.items);
  const current = items.filter(item => pathname === item.href || (!item.exact && pathname.startsWith(`${item.href}/`))).sort((a, b) => b.href.length - a.href.length)[0];
  const home = items.find(item => item.exact);
  return <Breadcrumb className="min-w-0">
    <BreadcrumbList className="flex-nowrap">
      <BreadcrumbItem className="hidden md:inline-flex">
        {home ? <BreadcrumbLink render={<Link href={home.href} />}>{title}</BreadcrumbLink> : title}
      </BreadcrumbItem>
      <BreadcrumbSeparator className="hidden md:block" />
      <BreadcrumbItem className="min-w-0"><BreadcrumbPage className="truncate">{current?.title ?? title}</BreadcrumbPage></BreadcrumbItem>
    </BreadcrumbList>
  </Breadcrumb>;
}
