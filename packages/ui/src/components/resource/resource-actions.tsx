import type { ComponentProps } from "react";
import { cn } from "cn";
import { Separator } from "@vibe/ui/components/separator";

/** Local composition of shadcn primitives, not a registry component. */
export function ResourceActionHeader({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="resource-action-header" className={cn("flex flex-wrap items-center gap-2 sm:shrink-0", className)} {...props} />;
}

export function ResourceActionFooter({ className, children, ...props }: ComponentProps<"footer">) {
  return <footer data-slot="resource-action-footer" className={cn("flex flex-col gap-4", className)} {...props}>
    <Separator />
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">{children}</div>
  </footer>;
}
