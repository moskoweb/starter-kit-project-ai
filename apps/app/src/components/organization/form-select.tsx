"use client";

import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@vibe/ui/components/select";

type Item = { value: string | null; label: string };

/** shadcn Select posting through a hidden input (`name`) inside plain forms. */
export function FormSelect({ id, name, items, defaultValue, required, size, className, "aria-label": ariaLabel }: { id?: string; name: string; items: Item[]; defaultValue?: string | null; required?: boolean; size?: "sm" | "default"; className?: string; "aria-label"?: string }) {
  return <Select name={name} items={items} defaultValue={defaultValue ?? null} required={required}>
    <SelectTrigger id={id} size={size} className={className} aria-label={ariaLabel}><SelectValue /></SelectTrigger>
    <SelectContent>
      <SelectGroup>{items.filter(item => item.value !== null).map(item => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectGroup>
    </SelectContent>
  </Select>;
}
