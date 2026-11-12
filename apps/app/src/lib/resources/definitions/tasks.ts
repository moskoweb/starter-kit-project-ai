import "server-only";
import { and, asc, count, desc, eq, ilike } from "drizzle-orm";
import { headers } from "next/headers";
import { projects, tasks } from "@vibe/db/schema";
import { canAccessProject, withAuthorizedProjects } from "@vibe/auth";
import { createTask, updateTask, deleteTask, bulkDeleteTasks } from "../actions";
import { defineResource, type ResourceScope } from "../define";
import { likePattern } from "../list-state";
import { result, taskRecord } from "./shared";

const columns = { title: tasks.title, projectName: projects.name, createdAt: tasks.createdAt, updatedAt: tasks.updatedAt };

async function projectOptions({ identifier }: ResourceScope) {
  const rows = await withAuthorizedProjects(await headers(), identifier, "read", tx => tx.select({ id: projects.id, name: projects.name }).from(projects).orderBy(asc(projects.name), asc(projects.id)).limit(500));
  return rows.map(row => ({ value: row.id, label: { "pt-BR": row.name, en: row.name } }));
}

export const taskResource = defineResource({
  slug: "tasks",
  label: { "pt-BR": "Tarefa", en: "Task" },
  pluralLabel: { "pt-BR": "Tarefas", en: "Tasks" },
  description: { "pt-BR": "Tarefas dos projetos deste espaço de trabalho.", en: "Tasks from projects in this workspace." },
  icon: "tasks",
  navigationGroup: { "pt-BR": "Trabalho", en: "Work" },
  titleKey: "title",
  can: (role, operation) => role === null || canAccessProject(role, operation),
  table: {
    columns: [
      { key: "title", label: { "pt-BR": "Título", en: "Title" }, primary: true, sortable: true },
      { key: "projectName", label: { "pt-BR": "Projeto", en: "Project" }, sortable: true, toggleable: true },
      { key: "createdAt", label: { "pt-BR": "Criada em", en: "Created" }, type: "datetime", sortable: true, toggleable: true },
      { key: "updatedAt", label: { "pt-BR": "Atualizada em", en: "Updated" }, type: "datetime", sortable: true, toggleable: true, hidden: true },
    ],
    filters: async scope => [{ key: "projectId", label: { "pt-BR": "Projeto", en: "Project" }, type: "select", options: await projectOptions(scope) }],
    defaultSort: { key: "createdAt", direction: "desc" },
    sortable: Object.keys(columns),
  },
  form: async scope => [{
    title: { "pt-BR": "Detalhes", en: "Details" },
    fields: [
      { name: "title", label: { "pt-BR": "Título", en: "Title" }, type: "text", required: true, maxLength: 500 },
      { name: "projectId", label: { "pt-BR": "Projeto", en: "Project" }, type: "select", required: true, disabledOnEdit: true, options: await projectOptions(scope), description: { "pt-BR": "O projeto não pode ser alterado depois da criação.", en: "Project cannot change after creation." } },
    ],
  }],
  infolist: async () => [{
    title: { "pt-BR": "Detalhes", en: "Details" },
    columns: 2,
    entries: [
      { key: "title", label: { "pt-BR": "Título", en: "Title" } },
      { key: "projectName", label: { "pt-BR": "Projeto", en: "Project" } },
      { key: "createdAt", label: { "pt-BR": "Criada em", en: "Created" }, type: "datetime" },
      { key: "updatedAt", label: { "pt-BR": "Atualizada em", en: "Updated" }, type: "datetime" },
    ],
  }],
  list: async ({ identifier }, state) => withAuthorizedProjects(await headers(), identifier, "read", async tx => {
    const where = and(state.search ? ilike(tasks.title, likePattern(state.search)) : undefined, state.filters.projectId ? eq(tasks.projectId, state.filters.projectId) : undefined);
    const order = columns[state.sort as keyof typeof columns] ?? tasks.createdAt;
    const [rows, [{ total }]] = await Promise.all([
      tx.select({ task: tasks, projectName: projects.name }).from(tasks).leftJoin(projects, eq(projects.id, tasks.projectId)).where(where).orderBy(state.direction === "asc" ? asc(order) : desc(order), asc(tasks.id)).limit(state.pageSize).offset((state.page - 1) * state.pageSize),
      tx.select({ total: count() }).from(tasks).where(where),
    ]);
    return { records: rows.map(row => taskRecord({ ...row.task, projectName: row.projectName })), total };
  }),
  get: async ({ identifier }, id) => withAuthorizedProjects(await headers(), identifier, "read", async tx => {
    const [row] = await tx.select({ task: tasks, projectName: projects.name }).from(tasks).leftJoin(projects, eq(projects.id, tasks.projectId)).where(eq(tasks.id, id)).limit(1);
    return row ? taskRecord({ ...row.task, projectName: row.projectName }) : null;
  }),
  create: async ({ identifier }, values) => result(await createTask(identifier, values)),
  update: async ({ identifier }, id, values) => result(await updateTask(identifier, id, values)),
  delete: async ({ identifier }, ids) => result(ids.length === 1 ? await deleteTask(identifier, ids[0]!) : await bulkDeleteTasks(identifier, { ids })),
});

