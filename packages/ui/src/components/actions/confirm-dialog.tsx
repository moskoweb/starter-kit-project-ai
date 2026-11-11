"use client";
import { useState, type ReactElement } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogTrigger, DialogClose } from "../ui/dialog";
import { Button } from "../ui/button";
export interface ConfirmDialogProps { trigger: ReactElement; title: string; description: string; confirmLabel: string; cancelLabel: string; errorMessage: string; onConfirm: () => void | Promise<void>; destructive?: boolean; }
export function ConfirmDialog({ trigger, title, description, confirmLabel, cancelLabel, errorMessage, onConfirm, destructive = false }: ConfirmDialogProps) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  async function confirm() { setPending(true); setFailed(false); try { await onConfirm(); setOpen(false); } catch { setFailed(true); } finally { setPending(false); } }
  return <Dialog open={open} onOpenChange={value => { if (!pending) { setOpen(value); setFailed(false); } }}><DialogTrigger asChild>{trigger}</DialogTrigger><DialogContent onEscapeKeyDown={event => { if (pending) event.preventDefault(); }} onPointerDownOutside={event => { if (pending) event.preventDefault(); }}><DialogTitle className="text-lg font-semibold">{title}</DialogTitle><DialogDescription className="text-sm text-muted-foreground">{description}</DialogDescription>{failed && <p role="alert" className="text-sm text-destructive">{errorMessage}</p>}<div className="flex justify-end gap-2" aria-busy={pending}><DialogClose asChild><Button variant="outline" disabled={pending} autoFocus>{cancelLabel}</Button></DialogClose><Button variant={destructive ? "destructive" : "default"} disabled={pending} onClick={confirm}>{confirmLabel}</Button></div></DialogContent></Dialog>;
}
