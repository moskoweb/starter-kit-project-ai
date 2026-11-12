"use client";

import { ResourceForm } from "@vibe/ui/components/resource/resource-form";
import { ResourceTable } from "@vibe/ui/components/resource/resource-table";
import type { ResourceFormProps, ResourceTableProps } from "@vibe/ui/components/resource/types";
import type { ActionResult } from "@vibe/ui/lib/schema";
import { toLabels, type ResourceText } from "@/lib/resources/labels";

type Serializable<T> = Omit<T, "labels"> & { text: ResourceText };

export function ResourceTableView({ text, onDelete, ...props }: Omit<Serializable<ResourceTableProps>, "onDelete" | "onBulkDelete"> & { onDelete?: (ids: string[]) => Promise<ActionResult> }) {
  return <ResourceTable {...props} labels={toLabels(text)} onDelete={onDelete && (id => onDelete([id]))} onBulkDelete={onDelete} />;
}

export function ResourceFormView({ text, basePath, ...props }: Omit<Serializable<ResourceFormProps>, "redirectTo"> & { basePath: string }) {
  return <ResourceForm {...props} labels={toLabels(text)} redirectTo={id => id ? `${basePath}/${encodeURIComponent(id)}` : basePath} />;
}
