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
import { Calendar } from "@vibe/ui/components/calendar";
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList } from "@vibe/ui/components/combobox";
import { Popover, PopoverContent, PopoverTrigger } from "@vibe/ui/components/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@vibe/ui/components/select";
import { Spinner } from "@vibe/ui/components/spinner";
import { Switch } from "@vibe/ui/components/switch";
import { Textarea } from "@vibe/ui/components/textarea";
import { CalendarIcon } from "lucide-react";
import { format, isValid, parseISO } from "date-fns";
import type { FormField, Option } from "../../lib/schema";
import type { ResourceFormProps } from "./types";

type Values = Record<string, string | number | boolean | null>;

function initialValue(field: FormField, record: ResourceFormProps["record"]): string | boolean {
  const value = record?.[field.name];
  if (field.type === "boolean") return value === true;
  if (field.type === "date" && typeof value === "string") return value.slice(0, 10);
  return value === null || value === undefined ? "" : String(value);
}

/** Schema-driven create/edit form. Server action re-validates; field errors map back by name. */
export function ResourceForm({ sections, record, redirectTo, cancelHref, labels, locale, onSubmit }: ResourceFormProps) {
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
          {section.fields.map(field => <FieldControl key={field.name} field={field} value={values[field.name]!} error={errors[field.name]} disabled={pending || (editing && !!field.disabledOnEdit)} labels={labels} locale={locale} onChange={value => set(field.name, value)} />)}
        </FieldGroup>
      </CardContent>
    </Card>)}
    <div className="flex items-center gap-2">
      <Button type="submit" disabled={pending}>{pending && <Spinner data-icon="inline-start" />}{pending ? labels.saving : labels.save}</Button>
      <Link href={cancelHref} className={buttonVariants({ variant: "outline" })}>{labels.cancel}</Link>
    </div>
  </form>;
}

type ControlLabels = Pick<ResourceFormProps["labels"], "choose" | "searchOptions" | "noOptions" | "pickDate">;
function FieldControl({ field, value, error, disabled, labels, locale, onChange }: { field: FormField; value: string | boolean; error?: string; disabled: boolean; labels: ControlLabels; locale?: string; onChange: (value: string | boolean) => void }) {
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
      : field.type === "select" ? <Select items={[{ value: null, label: labels.choose }, ...(field.options ?? [])]} value={String(value) || null} disabled={disabled} onValueChange={next => onChange(next ?? "")}>
        <SelectTrigger id={id} className="w-full" aria-invalid={common["aria-invalid"]} aria-describedby={described}><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value={null}>{labels.choose}</SelectItem>
          {field.options?.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
        </SelectContent>
      </Select>
      : field.type === "combobox" ? <OptionCombobox id={id} options={field.options ?? []} value={String(value)} disabled={disabled} invalid={!!error} described={described} labels={labels} onChange={onChange} />
      : field.type === "date" ? <DatePicker id={id} value={String(value)} disabled={disabled} invalid={!!error} described={described} placeholder={field.placeholder ?? labels.pickDate} locale={locale} onChange={onChange} />
      : <Input {...common} type={field.type} maxLength={field.maxLength} min={field.min} max={field.max} placeholder={field.placeholder} value={String(value)} onChange={event => onChange(event.target.value)} />}
    {field.description && <FieldDescription id={`${id}-description`}>{field.description}</FieldDescription>}
    {error && <FieldError id={`${id}-error`}>{error}</FieldError>}
  </Field>;
}

/** Searchable single choice (shadcn Combobox). Value is the option `value`; empty string = none. */
function OptionCombobox({ id, options, value, disabled, invalid, described, labels, onChange }: { id: string; options: Option[]; value: string; disabled: boolean; invalid: boolean; described?: string; labels: ControlLabels; onChange: (value: string) => void }) {
  return <Combobox items={options} value={options.find(option => option.value === value) ?? null} disabled={disabled} itemToStringLabel={(option: Option) => option.label} isItemEqualToValue={(a: Option, b: Option) => a.value === b.value} onValueChange={(option: Option | null) => onChange(option?.value ?? "")}>
    <ComboboxInput id={id} className="w-full" placeholder={labels.searchOptions} disabled={disabled} showClear={!!value} aria-invalid={invalid || undefined} aria-describedby={described} />
    <ComboboxContent>
      <ComboboxEmpty>{labels.noOptions}</ComboboxEmpty>
      <ComboboxList>{(option: Option) => <ComboboxItem key={option.value} value={option}>{option.label}</ComboboxItem>}</ComboboxList>
    </ComboboxContent>
  </Combobox>;
}

/** Popover + Calendar; value is an ISO date string (`yyyy-MM-dd`). */
function DatePicker({ id, value, disabled, invalid, described, placeholder, locale, onChange }: { id: string; value: string; disabled: boolean; invalid: boolean; described?: string; placeholder: string; locale?: string; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const date = value ? parseISO(value) : undefined;
  const selected = date && isValid(date) ? date : undefined;
  return <Popover open={open} onOpenChange={setOpen}>
    <PopoverTrigger render={<Button id={id} type="button" variant="outline" disabled={disabled} aria-invalid={invalid || undefined} aria-describedby={described} className={cn("w-full justify-start font-normal", !selected && "text-muted-foreground")} />}>
      <CalendarIcon data-icon="inline-start" />{selected ? new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(selected) : placeholder}
    </PopoverTrigger>
    <PopoverContent className="w-auto p-0" align="start">
      <Calendar mode="single" selected={selected} defaultMonth={selected} captionLayout="dropdown" onSelect={day => { onChange(day ? format(day, "yyyy-MM-dd") : ""); setOpen(false); }} />
    </PopoverContent>
  </Popover>;
}
