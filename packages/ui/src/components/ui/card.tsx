import type { ComponentProps, ReactNode } from "react";
export interface CardProps extends ComponentProps<"div"> { children: ReactNode; }
export function Card({ children, className = "", style, ...props }: CardProps) {
  return <div className={`rounded-lg border border-border bg-card p-6 ${className}`} style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "1.5rem", ...style }} {...props}>{children}</div>;
}
