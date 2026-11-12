"use client";

import { useState, type ReactElement } from "react";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@vibe/ui/components/alert-dialog";
import { Button } from "@vibe/ui/components/button";
import { Spinner } from "@vibe/ui/components/spinner";

type ConfirmProps = { title: string; description: string; confirmLabel: string; cancelLabel: string; onConfirm: () => Promise<void>; destructive?: boolean };

/**
 * Confirmation modal for destructive or irreversible actions. Rejection keeps dialog open.
 * Pass `trigger` (a button) for self-contained use, or `open`/`onOpenChange` when the opener lives elsewhere
 * (e.g. a dropdown menu item: keeps its menuitem role and keyboard navigation).
 */
export function ConfirmAction({ trigger, open: controlledOpen, onOpenChange, title, description, confirmLabel, cancelLabel, onConfirm, destructive = false }: ConfirmProps & { trigger?: ReactElement; open?: boolean; onOpenChange?: (open: boolean) => void }) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = onOpenChange ?? setUncontrolledOpen;
  async function confirm() {
    setPending(true);
    try { await onConfirm(); setOpen(false); } catch { /* caller reports error */ } finally { setPending(false); }
  }
  return <AlertDialog open={open} onOpenChange={value => { if (!pending) setOpen(value); }}>
    {trigger && <AlertDialogTrigger render={trigger} />}
    <AlertDialogContent>
      <AlertDialogHeader><AlertDialogTitle>{title}</AlertDialogTitle><AlertDialogDescription>{description}</AlertDialogDescription></AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel disabled={pending}>{cancelLabel}</AlertDialogCancel>
        <Button variant={destructive ? "destructive" : "default"} disabled={pending} onClick={() => void confirm()}>{pending && <Spinner data-icon="inline-start" />}{confirmLabel}</Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>;
}
