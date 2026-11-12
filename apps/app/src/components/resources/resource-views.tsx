"use client";

import { RecordActions } from "@vibe/ui/components/resource/record-actions";
import { ResourceForm } from "@vibe/ui/components/resource/resource-form";
import { ResourceTable } from "@vibe/ui/components/resource/resource-table";
import type { ResourceFormProps, ResourceTableProps } from "@vibe/ui/components/resource/types";
import type { ActionResult, RecordActionDef } from "@vibe/ui/lib/schema";
import { navIcons } from "@/components/panels/nav-icons";
import { toLabels, type ResourceText } from "@/lib/resources/labels";

type Serializable<T> = Omit<T, "labels"> & { text: ResourceText };

export function ResourceTableView({ text, onDelete, ...props }: Omit<Serializable<ResourceTableProps>, "onDelete" | "onBulkDelete" | "actionIcons"> & { onDelete?: (ids: string[]) => Promise<ActionResult> }) {
  return <ResourceTable {...props} labels={toLabels(text)} actionIcons={navIcons} onDelete={onDelete && (id => onDelete([id]))} onBulkDelete={onDelete} />;
}

export function ResourceFormView({ text, basePath, ...props }: Omit<Serializable<ResourceFormProps>, "redirectTo"> & { basePath: string }) {
  return <ResourceForm {...props} labels={toLabels(text)} redirectTo={id => id ? `${basePath}/${encodeURIComponent(id)}` : basePath} />;
}

/** View-page header buttons for record actions visible on this record. */
export function RecordActionsView({ id, actions, text, onRecordAction }: { id: string; actions: RecordActionDef[]; text: ResourceText; onRecordAction: (action: string, ids: string[]) => Promise<ActionResult> }) {
  return <RecordActions id={id} actions={actions} icons={navIcons} labels={toLabels(text)} onRecordAction={onRecordAction} />;
}
