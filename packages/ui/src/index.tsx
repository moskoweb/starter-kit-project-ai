export { Card, type CardProps } from "./components/ui/card";
export { Badge, type BadgeProps } from "./components/ui/badge";
import React, { type CSSProperties, type ReactNode } from "react";



export interface HeadingProps {
  children: ReactNode;
  level?: 1 | 2 | 3 | 4;
  style?: CSSProperties;
}

export function Heading({ children, level = 1, style }: HeadingProps) {
  const Tag = (`h${level}` as const);
  const sizeMap: Record<number, string> = {
    1: "1.875rem",
    2: "1.5rem",
    3: "1.25rem",
    4: "1rem",
  };

  return (
    <Tag
      style={{
        margin: "0 0 0.5rem 0",
        fontWeight: 700,
        fontSize: sizeMap[level],
        color: "var(--foreground)",
        lineHeight: 1.25,
        ...style,
      }}
    >
      {children}
    </Tag>
  );
}

export interface TextProps {
  children: ReactNode;
  muted?: boolean;
  mono?: boolean;
  style?: CSSProperties;
}

export function Text({ children, muted = false, mono = false, style }: TextProps) {
  return (
    <p
      style={{
        margin: "0 0 0.5rem 0",
        fontSize: "0.9375rem",
        lineHeight: 1.5,
        color: muted ? "var(--muted-foreground)" : "var(--foreground)",
        fontFamily: mono ? "var(--ui-font-mono)" : "var(--ui-font-sans)",
        ...style,
      }}
    >
      {children}
    </p>
  );
}

export * from "./components/ui/button";
export * from "./components/ui/input";
export * from "./components/ui/label";
export * from "./components/ui/select";
export * from "./components/ui/dialog";
export * from "./components/ui/table";
export * from "./components/data-table/data-table";
export * from "./components/form/form";
export * from "./components/infolist/infolist";
export * from "./components/actions/confirm-dialog";
export * from "./components/actions/confirm-submit";
export * from "./components/widgets/stat-widget";
export * from "./components/widgets/chart-widget";
