"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, zodResolver, Form, FormInput, Button, Select } from "@vibe/ui";
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
  return <><div className="flex gap-3"><Button type="submit" disabled={pending}>{pending ? en ? "Saving…" : "Salvando…" : en ? "Save" : "Salvar"}</Button><a href={cancelHref}>{en ? "Cancel" : "Cancelar"}</a></div>{error && <p role="alert">{error}</p>}</>;
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
  return <Form {...form}><form noValidate onSubmit={form.handleSubmit(values => save(values, onSave))} className="grid max-w-xl gap-4"><FormInput<ProjectValues> name="name" label={en ? "Name" : "Nome"} required maxLength={200} /><FormInput<ProjectValues> name="description" label={en ? "Description" : "Descrição"} /><SaveActions en={en} pending={form.formState.isSubmitting} error={error} cancelHref={cancelHref} /></form></Form>;
}

function TaskForm({ basePath, cancelHref, initialValues = {}, onSave, projects = [], locale = "pt-BR" }: TaskProps) {
  const en = locale === "en";
  const form = useForm<TaskValues>({ resolver: zodResolver(taskInputSchema), defaultValues: initialValues });
  const { error, save } = useSave(basePath, en);
  const existingProject = initialValues.projectId != null;
  const selectedProject = projects.find(project => project.id === initialValues.projectId);
  return <Form {...form}><form noValidate onSubmit={form.handleSubmit(values => save(existingProject ? { title: values.title } : values, onSave))} className="grid max-w-xl gap-4"><FormInput<TaskValues> name="title" label={en ? "Title" : "Título"} required maxLength={500} />{existingProject ? <><input type="hidden" {...form.register("projectId")} /><p>{en ? "Project" : "Projeto"}: {selectedProject?.name ?? initialValues.projectId}</p></> : <label className="grid gap-2">{en ? "Project" : "Projeto"}<Select {...form.register("projectId")} aria-label={en ? "Project" : "Projeto"} aria-invalid={!!form.formState.errors.projectId} required><option value="">{en ? "Select a project" : "Selecione um projeto"}</option>{projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}</Select>{form.formState.errors.projectId?.message && <span role="alert">{form.formState.errors.projectId.message}</span>}</label>}<SaveActions en={en} pending={form.formState.isSubmitting} error={error} cancelHref={cancelHref} /></form></Form>;
}
