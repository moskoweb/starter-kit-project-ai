"use client";

import { useRouter } from "next/navigation";
import { useState, type ComponentType, type ReactElement } from "react";
import { toast } from "sonner";
import { Button } from "@vibe/ui/components/button";
import type { ActionResult, RecordActionDef } from "../../lib/schema";
import { ConfirmAction } from "./confirm-action";
import type { ResourceLabels } from "./types";

export type ActionIcons = Record<string, ComponentType<{ "data-icon"?: string; className?: string }>>;
type Labels = Pick<ResourceLabels, "actionSucceeded" | "actionFailed" | "cancel" | "confirm" | "confirmAction" | "confirmActionTitle" | "confirmActionDescription">;

/** Runs a record action, toasts the result, then refreshes (or full-reloads on `redirectTo`). Rejects on failure so ConfirmAction stays open. */
export function useRecordAction(onRecordAction: ((action: string, ids: string[]) => Promise<ActionResult>) | undefined, labels: Labels, onDone?: () => void) {
  const router = useRouter();
  return async (action: RecordActionDef, ids: string[]) => {
    const result = await (onRecordAction?.(action.name, ids) ?? Promise.resolve<ActionResult>({ ok: false, error: "UNAVAILABLE" })).catch((): ActionResult => ({ ok: false, error: "REQUEST_FAILED" }));
    if (!result.ok) { toast.error(labels.actionFailed(action.label)); throw new Error(result.error); }
    toast.success(labels.actionSucceeded(action.label));
    onDone?.();
    if (result.redirectTo) window.location.assign(result.redirectTo); // full reload: action may swap session cookie
    else router.refresh();
  };
}

/** Renders `trigger(onClick)`; destructive or `confirm` actions open a controlled ConfirmAction instead of running directly. */
export function ActionTrigger({ action, labels, count = 1, run, trigger }: { action: RecordActionDef; labels: Labels; count?: number; run: () => Promise<void>; trigger: (onClick: () => void) => ReactElement }) {
  const [open, setOpen] = useState(false);
  if (!action.confirm && !action.destructive) return trigger(() => { void run().catch(() => undefined); });
  return <>
    {trigger(() => setOpen(true))}
    <ConfirmAction open={open} onOpenChange={setOpen} title={action.confirm?.title ?? labels.confirmActionTitle(action.label)} description={action.confirm?.description ?? labels.confirmActionDescription(count)}
      confirmLabel={action.label} cancelLabel={labels.cancel} destructive={action.destructive} onConfirm={run} />
  </>;
}

/** Controlled confirmation for an action chosen elsewhere (row menus). */
export function ConfirmPending({ pending, labels, onClose }: { pending: { action: RecordActionDef; run: () => Promise<void> } | null; labels: Labels; onClose: () => void }) {
  const action = pending?.action;
  return <ConfirmAction open={!!pending} onOpenChange={open => { if (!open) onClose(); }}
    title={action ? action.confirm?.title ?? labels.confirmActionTitle(action.label) : ""} description={action ? action.confirm?.description ?? labels.confirmActionDescription(1) : ""}
    confirmLabel={action?.label ?? labels.confirmAction} cancelLabel={labels.cancel} destructive={action?.destructive}
    onConfirm={async () => { await pending!.run(); onClose(); }} />;
}

/** Record actions as page-header buttons (view page). */
export function RecordActions({ id, actions, icons = {}, labels, onRecordAction }: { id: string; actions: RecordActionDef[]; icons?: ActionIcons; labels: Labels; onRecordAction: (action: string, ids: string[]) => Promise<ActionResult> }) {
  const execute = useRecordAction(onRecordAction, labels);
  return <>{actions.map(action => {
    const Icon = action.icon ? icons[action.icon] : undefined;
    return <ActionTrigger key={action.name} action={action} labels={labels} run={() => execute(action, [id])}
      trigger={onClick => <Button variant={action.destructive ? "destructive" : "outline"} onClick={onClick}>{Icon && <Icon data-icon="inline-start" />}{action.label}</Button>} />;
  })}</>;
}
