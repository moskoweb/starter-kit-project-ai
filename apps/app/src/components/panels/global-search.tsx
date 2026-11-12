"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@vibe/ui/components/button";
import { Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@vibe/ui/components/command";
import { Kbd, KbdGroup } from "@vibe/ui/components/kbd";
import type { NavGroup } from "./nav-main";
import { navIcons } from "./nav-icons";

/** Command palette for page navigation (Filament global search). */
export function GlobalSearch({ groups, labels }: { groups: NavGroup[]; labels: { search: string; placeholder: string; empty: string } }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) { event.preventDefault(); setOpen(value => !value); } };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);
  return <>
    <Button variant="outline" size="sm" className="w-9 justify-start px-2 text-muted-foreground sm:w-56 sm:px-3" onClick={() => setOpen(true)} aria-label={labels.search}>
      <Search /><span className="hidden sm:inline">{labels.search}</span>
      <KbdGroup className="ml-auto hidden sm:inline-flex"><Kbd>⌘</Kbd><Kbd>K</Kbd></KbdGroup>
    </Button>
    <CommandDialog open={open} onOpenChange={setOpen} title={labels.search} description={labels.placeholder}>
      <Command>
      <CommandInput placeholder={labels.placeholder} />
      <CommandList>
        <CommandEmpty>{labels.empty}</CommandEmpty>
        {groups.map(group => <CommandGroup key={group.label} heading={group.label}>
          {group.items.map(item => { const Icon = navIcons[item.icon]; return <CommandItem key={item.href} value={item.href} keywords={[item.title, group.label]} onSelect={() => { setOpen(false); router.push(item.href); }}><Icon />{item.title}</CommandItem>; })}
        </CommandGroup>)}
      </CommandList>
      </Command>
    </CommandDialog>
  </>;
}
