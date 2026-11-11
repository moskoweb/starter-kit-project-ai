import type { ComponentProps } from "react";
/** Adapted from shadcn/ui button (MIT); see docs/UI.md. */
export type ButtonProps = ComponentProps<"button"> & { variant?: "default" | "outline" | "ghost" | "destructive"; size?: "default" | "sm" | "icon" };
const variants = { default: "bg-primary text-primary-foreground hover:opacity-90", outline: "border border-input bg-background hover:bg-accent", ghost: "hover:bg-accent", destructive: "bg-destructive text-white hover:opacity-90" };
export function Button({ className = "", variant = "default", size = "default", type = "button", ...props }: ButtonProps) {
  return <button type={type} data-slot="button" className={`inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 ${size === "icon" ? "size-9" : size === "sm" ? "px-3 py-1" : "px-4 py-2"} ${variants[variant]} ${className}`} {...props} />;
}
