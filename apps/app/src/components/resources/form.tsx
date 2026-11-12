"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm, zodResolver, Form, FormInput } from "@vibe/ui";
import { Button } from "@vibe/ui/components/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@vibe/ui/components/field";
import { Input } from "@vibe/ui/components/input";
import { NativeSelect, NativeSelectOption } from "@vibe/ui/components/native-select";
import { projectInputSchema, taskInputSchema } from "../../lib/resources/validation";
import type { z } from "zod";
import type { ResourceResult } from "./list";

type ProjectValues = z.infer<typeof projectInputSchema>;
type TaskValues = z.infer<typeof taskInputSchema>;
type SharedProps = { basePath: string; cancelHref: string; projects?: { id: string; name: string }[]; locale?: "pt-BR" | "en" };
type ProjectProps = SharedProps & { kind: "projects"; initialValues?: Partial<ProjectValues>; onSave: (values: ProjectValues) => Promise<ResourceResult> };
type TaskProps = SharedProps & { kind: "tasks"; initialValues?: Partial<TaskValues>; onSave: (values: TaskValues | Pick<TaskValues, "title">) => Promise<ResourceResult> };

export function ResourceForm(props: ProjectProps | TaskProps) {
  return props.kind === "projects" ? <ProjectForm {...props} /> : <TaskForm {...props} />;
}

function SaveActions({ pending, error, cancelHref, en }: { pending: boolean; error: string; cancelHref: string; en: boolean }) {
  return <><Field orientation="horizontal"><Button type="submit" disabled={pending}>{pending ? en ? "Saving…" : "Salvando…" : en ? "Save" : "Salvar"}</Button><Button asChild variant="outline"><Link href={cancelHref}>{en ? "Cancel" : "Cancelar"}</Link></Button></Field>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}</>;
}

function useSave(basePath: string, en: boolean) {
  const router = useRouter();
  const [error, setError] = useState("");
  async function save<T>(values: T, onSave: (values: T) => Promise<ResourceResult>) {
    setError("");
    try {
      const result = await onSave(values);
      if (!result.ok) setError(en ? "Could not save." : "Não foi possível salvar.");
      else router.push(result.id ? `${basePath}/${encodeURIComponent(result.id)}` : basePath);
    } catch { setError(en ? "Could not save." : "Não foi possível salvar."); }
  }
  return { error, save };
}

function ProjectForm({ basePath, cancelHref, initialValues = {}, onSave, locale = "pt-BR" }: ProjectProps) {
  const en = locale === "en";
  const form = useForm<ProjectValues>({ resolver: zodResolver(projectInputSchema), defaultValues: initialValues });
  const { error, save } = useSave(basePath, en);
  return <Form {...form}><form noValidate onSubmit={form.handleSubmit(values => save(values, onSave))} className="max-w-xl"><FieldGroup><FormInput<ProjectValues> name="name" label={en ? "Name" : "Nome"} required maxLength={200} /><FormInput<ProjectValues> name="description" label={en ? "Description" : "Descrição"} /><SaveActions en={en} pending={form.formState.isSubmitting} error={error} cancelHref={cancelHref} /></FieldGroup></form></Form>;
}

function TaskForm({ basePath, cancelHref, initialValues = {}, onSave, projects = [], locale = "pt-BR" }: TaskProps) {
  const en = locale === "en";
  const form = useForm<TaskValues>({ resolver: zodResolver(taskInputSchema), defaultValues: initialValues });
  const { error, save } = useSave(basePath, en);
  const projectFieldId = useId();
  const existingProject = initialValues.projectId != null;
  const selectedProject = projects.find(project => project.id === initialValues.projectId);
  return <Form {...form}><form noValidate onSubmit={form.handleSubmit(values => save(existingProject ? { title: values.title } : values, onSave))} className="max-w-xl"><FieldGroup><FormInput<TaskValues> name="title" label={en ? "Title" : "Título"} required maxLength={500} />{existingProject ? <><Input type="hidden" {...form.register("projectId")} /><p className="text-sm">{en ? "Project" : "Projeto"}: {selectedProject?.name ?? initialValues.projectId}</p></> : <Field data-invalid={!!form.formState.errors.projectId || undefined}><FieldLabel htmlFor={projectFieldId}>{en ? "Project" : "Projeto"}</FieldLabel><NativeSelect id={projectFieldId} className="w-full" {...form.register("projectId")} aria-invalid={!!form.formState.errors.projectId} required><NativeSelectOption value="">{en ? "Select a project" : "Selecione um projeto"}</NativeSelectOption>{projects.map(project => <NativeSelectOption key={project.id} value={project.id}>{project.name}</NativeSelectOption>)}</NativeSelect>{form.formState.errors.projectId?.message && <FieldError>{form.formState.errors.projectId.message}</FieldError>}</Field>}<SaveActions en={en} pending={form.formState.isSubmitting} error={error} cancelHref={cancelHref} /></FieldGroup></form></Form>;
}
