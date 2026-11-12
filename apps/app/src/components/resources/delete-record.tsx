"use client";

import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@vibe/ui/components/button";
import { ConfirmAction } from "@vibe/ui/components/resource/confirm-action";
import type { ActionResult } from "@vibe/ui/lib/schema";
import { toLabels, type ResourceText } from "@/lib/resources/labels";

export function DeleteRecord({ id, text, redirectTo, onDelete }: { id: string; text: ResourceText; redirectTo: string; onDelete: (ids: string[]) => Promise<ActionResult> }) {
  const router = useRouter();
  const labels = toLabels(text);
  return <ConfirmAction title={labels.confirmDeleteTitle} description={labels.confirmDeleteDescription(1)} confirmLabel={labels.confirm} cancelLabel={labels.cancel} destructive
    trigger={<Button variant="destructive"><Trash2 data-icon="inline-start" />{labels.delete}</Button>}
    onConfirm={async () => {
      const result = await onDelete([id]).catch(() => ({ ok: false as const, error: "REQUEST_FAILED" }));
      if (!result.ok) { toast.error(labels.deleteFailed); throw new Error("DELETE_FAILED"); }
      toast.success(labels.deleted);
      router.push(redirectTo);
      router.refresh();
    }} />;
}
