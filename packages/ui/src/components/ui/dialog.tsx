"use client";
import type { ComponentProps } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
/** Adapted from shadcn/ui dialog (MIT); see docs/UI.md. */
export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;
export const DialogTitle = DialogPrimitive.Title;
export const DialogDescription = DialogPrimitive.Description;
export function DialogContent({ className = "", children, ...props }: ComponentProps<typeof DialogPrimitive.Content>) {
  return <DialogPrimitive.Portal><DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50" /><DialogPrimitive.Content className={`fixed left-1/2 top-1/2 z-50 grid max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 overflow-auto rounded-lg border border-border bg-background p-6 text-foreground shadow-lg ${className}`} {...props}>{children}</DialogPrimitive.Content></DialogPrimitive.Portal>;
}
