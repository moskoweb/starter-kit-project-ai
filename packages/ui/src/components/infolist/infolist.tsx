import type { ComponentProps, ReactNode } from "react";
export function Infolist({ className = "", ...props }: ComponentProps<"dl">) { return <dl className={`grid gap-4 sm:grid-cols-2 ${className}`} {...props} />; }
export function InfolistEntry({ label, children }: { label: string; children: ReactNode }) { return <div className="min-w-0"><dt className="text-sm text-muted-foreground">{label}</dt><dd className="mt-1 break-words text-sm">{children}</dd></div>; }
