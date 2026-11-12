"use client";

import { useState, type ReactElement } from "react";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@vibe/ui/components/alert-dialog";
import { Button } from "@vibe/ui/components/button";
import { Spinner } from "@vibe/ui/components/spinner";

/** Confirmation modal for destructive or irreversible actions. Rejection keeps dialog open. */
export function ConfirmAction({ trigger, title, description, confirmLabel, cancelLabel, onConfirm, destructive = false, nativeButton = true }: { trigger: ReactElement; /** Set false when trigger renders a non-button element (e.g. menu item). */ nativeButton?: boolean; title: string; description: string; confirmLabel: string; cancelLabel: string; onConfirm: () => Promise<void>; destructive?: boolean }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  async function confirm() {
    setPending(true);
    try { await onConfirm(); setOpen(false); } catch { /* caller reports error */ } finally { setPending(false); }
  }
  return <AlertDialog open={open} onOpenChange={value => { if (!pending) setOpen(value); }}>
    <AlertDialogTrigger render={trigger} nativeButton={nativeButton} />
    <AlertDialogContent>
      <AlertDialogHeader><AlertDialogTitle>{title}</AlertDialogTitle><AlertDialogDescription>{description}</AlertDialogDescription></AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel disabled={pending}>{cancelLabel}</AlertDialogCancel>
        <Button variant={destructive ? "destructive" : "default"} disabled={pending} onClick={() => void confirm()}>{pending && <Spinner data-icon="inline-start" />}{confirmLabel}</Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>;
}
