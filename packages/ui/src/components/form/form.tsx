"use client";
import { useId, type ComponentProps } from "react";
import { Controller, FormProvider, useFormContext, type ControllerProps, type FieldPath, type FieldValues } from "react-hook-form";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
export { zodResolver } from "@hookform/resolvers/zod";
export { useForm } from "react-hook-form";
export const Form = FormProvider;
export function FormField<T extends FieldValues, N extends FieldPath<T>>(props: ControllerProps<T, N>) { return <Controller {...props} />; }
export function FormInput<T extends FieldValues>({ name, label, description, ...props }: Omit<ComponentProps<typeof Input>, "name"> & { name: FieldPath<T>; label: string; description?: string }) {
  const id = useId();
  const { register, getFieldState, formState } = useFormContext<T>();
  const { error } = getFieldState(name, formState);
  return <div className="space-y-2"><Label htmlFor={id}>{label}</Label><Input {...props} {...register(name)} id={id} aria-invalid={!!error} aria-describedby={error ? id + "-error" : description ? id + "-description" : undefined} />{description && <p id={id + "-description"} className="text-sm text-muted-foreground">{description}</p>}{error && <p id={id + "-error"} role="alert" className="text-sm text-destructive">{error.message}</p>}</div>;
}
