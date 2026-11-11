import type { ComponentProps } from "react";

/** Adapted from shadcn/ui input (MIT); see docs/UI.md. */
export function Input({ className = "", ...props }: ComponentProps<"input">) {
  return <input data-slot="input" className={`flex w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive ${className}`} {...props} />;
}
