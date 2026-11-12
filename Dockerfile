FROM node:22.23.2-bookworm-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /workspace

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps ./apps
COPY packages ./packages
RUN pnpm install --frozen-lockfile

FROM deps AS builder
COPY . .
ARG NEXT_PUBLIC_ANALYTICS_ENABLED=false
ARG NEXT_PUBLIC_POSTHOG_KEY
ARG NEXT_PUBLIC_POSTHOG_HOST
ARG S3_PUBLIC_UPLOAD_ORIGIN
RUN pnpm --filter app build

FROM node:22.23.2-bookworm-slim AS app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
WORKDIR /app
RUN groupadd --system --gid 1001 nodejs && useradd --system --uid 1001 --gid nodejs nextjs
COPY --from=builder --chown=nextjs:nodejs /workspace/apps/app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /workspace/apps/app/.next/static ./apps/app/.next/static
COPY --from=builder --chown=nextjs:nodejs /workspace/apps/app/public ./apps/app/public
USER nextjs
EXPOSE 3000
CMD ["node", "apps/app/server.js"]

FROM deps AS worker-builder
COPY . .
RUN pnpm --filter @vibe/worker build

FROM base AS worker
ENV NODE_ENV=production
COPY --from=worker-builder --chown=node:node /workspace /workspace
USER node
CMD ["pnpm", "--filter", "@vibe/worker", "start", "/workspace/apps/worker/src/handlers.ts"]
