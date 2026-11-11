import type { ComponentProps } from "react";
/** Native select retains platform keyboard and mobile selection behavior. */
export function Select({ className = "", ...props }: ComponentProps<"select">) {
  return <select className={`w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 aria-invalid:border-destructive ${className}`} {...props} />;
}
