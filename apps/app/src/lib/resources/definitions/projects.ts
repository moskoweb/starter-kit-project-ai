import "server-only";
import { and, asc, count, desc, eq, ilike, or } from "drizzle-orm";
import { headers } from "next/headers";
import { projects } from "@vibe/db/schema";
import { canAccessProject, withAuthorizedProjects } from "@vibe/auth";
import { createProject, updateProject, deleteProject, bulkDeleteProjects } from "../actions";
import { defineResource } from "../define";
import { likePattern } from "../list-state";
import { projectRecord, result } from "./shared";

const columns = { name: projects.name, createdAt: projects.createdAt, updatedAt: projects.updatedAt };

export const projectResource = defineResource({
  slug: "projects",
  label: { "pt-BR": "Projeto", en: "Project" },
  pluralLabel: { "pt-BR": "Projetos", en: "Projects" },
  description: { "pt-BR": "Projetos visíveis neste espaço de trabalho.", en: "Projects visible in this workspace." },
  icon: "projects",
  navigationGroup: { "pt-BR": "Trabalho", en: "Work" },
  titleKey: "name",
  can: (role, operation) => role === null || canAccessProject(role, operation),
  table: {
    columns: [
      { key: "name", label: { "pt-BR": "Nome", en: "Name" }, primary: true, sortable: true },
      { key: "description", label: { "pt-BR": "Descrição", en: "Description" }, toggleable: true },
      { key: "createdAt", label: { "pt-BR": "Criado em", en: "Created" }, type: "datetime", sortable: true, toggleable: true },
      { key: "updatedAt", label: { "pt-BR": "Atualizado em", en: "Updated" }, type: "datetime", sortable: true, toggleable: true, hidden: true },
    ],
    defaultSort: { key: "createdAt", direction: "desc" },
    sortable: Object.keys(columns),
  },
  form: async () => [{
    title: { "pt-BR": "Detalhes", en: "Details" },
    fields: [
      { name: "name", label: { "pt-BR": "Nome", en: "Name" }, type: "text", required: true, maxLength: 200 },
      { name: "description", label: { "pt-BR": "Descrição", en: "Description" }, type: "textarea", maxLength: 5000 },
    ],
  }],
  infolist: async () => [{
    title: { "pt-BR": "Detalhes", en: "Details" },
    columns: 2,
    entries: [
      { key: "name", label: { "pt-BR": "Nome", en: "Name" } },
      { key: "createdAt", label: { "pt-BR": "Criado em", en: "Created" }, type: "datetime" },
      { key: "description", label: { "pt-BR": "Descrição", en: "Description" }, fullWidth: true },
      { key: "updatedAt", label: { "pt-BR": "Atualizado em", en: "Updated" }, type: "datetime" },
    ],
  }],
  list: async ({ identifier }, state) => withAuthorizedProjects(await headers(), identifier, "read", async tx => {
    const where = state.search ? or(ilike(projects.name, likePattern(state.search)), ilike(projects.description, likePattern(state.search))) : undefined;
    const order = columns[state.sort as keyof typeof columns] ?? projects.createdAt;
    const [rows, [{ total }]] = await Promise.all([
      tx.select().from(projects).where(and(where)).orderBy(state.direction === "asc" ? asc(order) : desc(order), asc(projects.id)).limit(state.pageSize).offset((state.page - 1) * state.pageSize),
      tx.select({ total: count() }).from(projects).where(and(where)),
    ]);
    return { records: rows.map(projectRecord), total };
  }),
  get: async ({ identifier }, id) => withAuthorizedProjects(await headers(), identifier, "read", async tx => {
    const [row] = await tx.select().from(projects).where(eq(projects.id, id)).limit(1);
    return row ? projectRecord(row) : null;
  }),
  create: async ({ identifier }, values) => result(await createProject(identifier, values)),
  update: async ({ identifier }, id, values) => result(await updateProject(identifier, id, values)),
  delete: async ({ identifier }, ids) => result(ids.length === 1 ? await deleteProject(identifier, ids[0]!) : await bulkDeleteProjects(identifier, { ids })),
});
