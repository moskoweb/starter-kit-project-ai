import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@vibe/ui/components/breadcrumb";

/** Page heading with breadcrumbs, description and header actions (Filament page header). */
export function PageHeader({ title, description, breadcrumbs = [], actions }: { title: string; description?: string; breadcrumbs?: { label: string; href?: string }[]; actions?: ReactNode }) {
  return <header className="flex flex-col gap-3">
    {breadcrumbs.length > 0 && <Breadcrumb>
      <BreadcrumbList>
        {breadcrumbs.map((crumb, index) => <Fragment key={index}>
          {index > 0 && <BreadcrumbSeparator />}
          <BreadcrumbItem>{crumb.href ? <BreadcrumbLink render={<Link href={crumb.href} />}>{crumb.label}</BreadcrumbLink> : <BreadcrumbPage>{crumb.label}</BreadcrumbPage>}</BreadcrumbItem>
        </Fragment>)}
      </BreadcrumbList>
    </Breadcrumb>}
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex min-w-0 flex-col gap-1">
        <h1 className="truncate text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  </header>;
}
