"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { cn } from "cn";
import { Button, buttonVariants } from "@vibe/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@vibe/ui/components/card";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@vibe/ui/components/field";
import { Input } from "@vibe/ui/components/input";
import { NativeSelect, NativeSelectOption } from "@vibe/ui/components/native-select";
import { Spinner } from "@vibe/ui/components/spinner";
import { Switch } from "@vibe/ui/components/switch";
import { Textarea } from "@vibe/ui/components/textarea";
import type { FormField } from "../../lib/schema";
import type { ResourceFormProps } from "./types";

type Values = Record<string, string | number | boolean | null>;

function initialValue(field: FormField, record: ResourceFormProps["record"]): string | boolean {
  const value = record?.[field.name];
  if (field.type === "boolean") return value === true;
  return value === null || value === undefined ? "" : String(value);
}

/** Schema-driven create/edit form. Server action re-validates; field errors map back by name. */
export function ResourceForm({ sections, record, redirectTo, cancelHref, labels, onSubmit }: ResourceFormProps) {
  const router = useRouter();
  const editing = !!record;
  const fields = sections.flatMap(section => section.fields);
  const [values, setValues] = useState(() => Object.fromEntries(fields.map(field => [field.name, initialValue(field, record)])));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);

  function validate(): Record<string, string> {
    const found: Record<string, string> = {};
    for (const field of fields) {
      const value = values[field.name];
      if (editing && field.disabledOnEdit) continue;
      if (field.required && field.type !== "boolean" && String(value ?? "").trim() === "") found[field.name] = labels.required;
    }
    return found;
  }
  function serialize(): Values {
    const out: Values = {};
    for (const field of fields) {
      if (editing && field.disabledOnEdit) continue;
      const raw = values[field.name];
      if (field.type === "boolean") out[field.name] = raw === true;
      else if (field.type === "number") out[field.name] = raw === "" ? null : Number(raw);
      else out[field.name] = typeof raw === "string" && raw.trim() === "" ? null : (raw as string);
    }
    return out;
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length) { document.getElementById(`field-${Object.keys(found)[0]}`)?.focus(); return; }
    setPending(true);
    try {
      const result = await onSubmit(serialize());
      if (!result.ok) { setErrors(result.fieldErrors ?? {}); toast.error(labels.saveFailed); return; }
      toast.success(labels.saved);
      router.push(redirectTo(result.id ?? record?.id));
      router.refresh();
    } catch { toast.error(labels.saveFailed); } finally { setPending(false); }
  }
  function set(name: string, value: string | boolean) { setValues(old => ({ ...old, [name]: value })); setErrors(old => { const { [name]: _, ...rest } = old; return rest; }); }

  return <form onSubmit={submit} noValidate className="flex flex-col gap-6">
    {sections.map((section, index) => <Card key={index}>
      {(section.title || section.description) && <CardHeader>{section.title && <CardTitle>{section.title}</CardTitle>}{section.description && <CardDescription>{section.description}</CardDescription>}</CardHeader>}
      <CardContent>
        <FieldGroup className={cn(section.columns === 2 && "grid gap-6 md:grid-cols-2")}>
          {section.fields.map(field => <FieldControl key={field.name} field={field} value={values[field.name]!} error={errors[field.name]} disabled={pending || (editing && !!field.disabledOnEdit)} choose={labels.choose} onChange={value => set(field.name, value)} />)}
        </FieldGroup>
      </CardContent>
    </Card>)}
    <div className="flex items-center gap-2">
      <Button type="submit" disabled={pending}>{pending && <Spinner data-icon="inline-start" />}{pending ? labels.saving : labels.save}</Button>
      <Link href={cancelHref} className={buttonVariants({ variant: "outline" })}>{labels.cancel}</Link>
    </div>
  </form>;
}

function FieldControl({ field, value, error, disabled, choose, onChange }: { field: FormField; value: string | boolean; error?: string; disabled: boolean; choose: string; onChange: (value: string | boolean) => void }) {
  const id = `field-${field.name}`;
  const described = [field.description && `${id}-description`, error && `${id}-error`].filter(Boolean).join(" ") || undefined;
  const common = { id, name: field.name, disabled, "aria-invalid": !!error || undefined, "aria-describedby": described, required: field.required };
  if (field.type === "boolean") return <Field orientation="horizontal" data-invalid={!!error || undefined} className={cn(field.fullWidth && "md:col-span-2")}>
    <Switch id={id} checked={value === true} disabled={disabled} onCheckedChange={checked => onChange(checked)} aria-describedby={described} />
    <FieldLabel htmlFor={id}>{field.label}</FieldLabel>
  </Field>;
  return <Field data-invalid={!!error || undefined} data-disabled={disabled || undefined} className={cn((field.fullWidth || field.type === "textarea") && "md:col-span-2")}>
    <FieldLabel htmlFor={id}>{field.label}{field.required && <span aria-hidden className="text-destructive">*</span>}</FieldLabel>
    {field.type === "textarea" ? <Textarea {...common} rows={4} maxLength={field.maxLength} placeholder={field.placeholder} value={String(value)} onChange={event => onChange(event.target.value)} />
      : field.type === "select" ? <NativeSelect {...common} className="w-full" value={String(value)} onChange={event => onChange(event.target.value)}>
        <NativeSelectOption value="">{choose}</NativeSelectOption>
        {field.options?.map(option => <NativeSelectOption key={option.value} value={option.value}>{option.label}</NativeSelectOption>)}
      </NativeSelect>
      : <Input {...common} type={field.type} maxLength={field.maxLength} min={field.min} max={field.max} placeholder={field.placeholder} value={String(value)} onChange={event => onChange(event.target.value)} />}
    {field.description && <FieldDescription id={`${id}-description`}>{field.description}</FieldDescription>}
    {error && <FieldError id={`${id}-error`}>{error}</FieldError>}
  </Field>;
}
