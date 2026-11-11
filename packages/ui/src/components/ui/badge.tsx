import type { CSSProperties, ReactNode } from "react";
export interface BadgeProps {
  children: ReactNode;
  variant?: "success" | "danger" | "neutral";
  style?: CSSProperties;
}

export function Badge({ children, variant = "neutral", style }: BadgeProps) {
  const variantStyles: Record<string, CSSProperties> = {
    success: {
      backgroundColor: "var(--success-background)",
      color: "var(--success-foreground)",
      border: "1px solid #059669",
    },
    danger: {
      backgroundColor: "var(--danger-background)",
      color: "var(--danger-foreground)",
      border: "1px solid #dc2626",
    },
    neutral: {
      backgroundColor: "var(--accent)",
      color: "var(--muted-foreground)",
      border: "1px solid var(--border)",
    },
  };

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        fontSize: "0.8125rem",
        fontWeight: 600,
        padding: "0.25rem 0.625rem",
        borderRadius: "calc(var(--radius) - 2px)",
        fontFamily: "var(--ui-font-mono)",
        ...variantStyles[variant],
        ...style,
      }}
    >
      {children}
    </span>
  );
}
