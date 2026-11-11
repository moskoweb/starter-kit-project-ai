import type { ComponentProps } from "react";
export function Table({ className = "", ...props }: ComponentProps<"table">) { return <div className="overflow-x-auto"><table className={`w-full caption-bottom text-sm ${className}`} {...props} /></div>; }
export function TableHeader(props: ComponentProps<"thead">) { return <thead {...props} />; }
export function TableBody(props: ComponentProps<"tbody">) { return <tbody {...props} />; }
export function TableRow({ className = "", ...props }: ComponentProps<"tr">) { return <tr className={`border-b border-border hover:bg-accent/50 ${className}`} {...props} />; }
export function TableHead({ className = "", ...props }: ComponentProps<"th">) { return <th scope="col" className={`px-3 py-2 text-left font-medium text-muted-foreground ${className}`} {...props} />; }
export function TableCell({ className = "", ...props }: ComponentProps<"td">) { return <td className={`px-3 py-2 ${className}`} {...props} />; }
