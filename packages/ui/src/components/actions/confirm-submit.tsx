"use client";
import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@vibe/ui/components/button";

export function ConfirmSubmit({ children, message, pendingLabel = "…" }: { children: ReactNode; message: string; pendingLabel?: string }) {
  const { pending } = useFormStatus();
  return <Button type="submit" disabled={pending} onClick={event => { if (!window.confirm(message)) event.preventDefault(); }}>{pending ? pendingLabel : children}</Button>;
}
