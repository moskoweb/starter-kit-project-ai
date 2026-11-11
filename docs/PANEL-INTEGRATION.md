# Panel route integration

`apps/app/src/app/[...segments]/page.tsx` resolves paths with the panel registry and routes organization tenants through `resolveTenant`; authorization stays on server queries/actions. Global `/admin` requires `session.user.role === "admin"` and shows only user/organization counts. It never reads global projects or tasks. Personal resources use `withAuthorizedProjects(null)`; organization resources use configured tenant identifier and membership role.

Resource routes support `projects` and `tasks`, with list, `/new`, `/:id`, and `/:id/edit` views rendered by existing Resource components. Task creation options come from the authorized project transaction, capped at 100 rows. Server action wrappers re-check the session and call existing validated resource actions. Dates serialize to ISO strings before passing to client components.

Project charts count authorized projects by UTC creation month for the trailing twelve months. Empty periods render chart's empty message. Locale initializes from `locale` cookie (`en` or `pt-BR`). Organization switcher options come from authenticated memberships. Loading and error states live beside catchall page.
