import { z } from "zod";

export const uuidSchema = z.string().uuid();
export const projectInputSchema = z.object({ name: z.string().trim().min(1).max(200), description: z.string().trim().max(5000).nullable().optional() }).strict();
export const projectUpdateSchema = projectInputSchema.partial().refine((value) => Object.keys(value).length > 0);
export const taskInputSchema = z.object({ projectId: uuidSchema, title: z.string().trim().min(1).max(500) }).strict();
export const taskUpdateSchema = z.object({ title: z.string().trim().min(1).max(500) }).strict();
export const listSchema = z.object({ page: z.coerce.number().int().min(1).default(1), search: z.string().trim().max(200).default(""), sort: z.enum(["createdAt", "updatedAt", "name"]).default("createdAt"), direction: z.enum(["asc", "desc"]).default("desc") }).strict();
export const taskListSchema = listSchema.extend({ projectId: uuidSchema.optional(), sort: z.enum(["createdAt", "updatedAt", "title"]).default("createdAt") });
export const bulkDeleteSchema = z.object({ ids: z.array(uuidSchema).min(1).max(100) }).strict();
