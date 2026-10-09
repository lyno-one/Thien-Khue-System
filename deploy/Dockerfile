# Thien Khue S — mot Dockerfile, hai dich: `--target api` (Nest :3310) va `--target web` (Next :3300).
# Build tu goc repo: docker build -f deploy/Dockerfile --target web .  (docker-compose.yml da khai bao san)

FROM node:22-bookworm-slim AS base
# openssl: Prisma engine can libssl
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
RUN corepack enable
WORKDIR /app

# ---------- build: cai toan bo workspace, build contracts + api + web ----------
FROM base AS build
COPY . .
RUN pnpm install --frozen-lockfile
# NEXT_PUBLIC_* duoc nhung vao bundle luc build -> phai truyen o day, doi gia tri thi build lai web
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_SALES_TRAINING_URL
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
    NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY \
    NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_PUBLIC_SALES_TRAINING_URL=$NEXT_PUBLIC_SALES_TRAINING_URL \
    NEXT_OUTPUT=standalone \
    NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter api build && pnpm --filter web build

# ---------- api: chay dist/main.js; giu node_modules (Prisma client + CLI de migrate deploy) ----------
FROM base AS api
ENV NODE_ENV=production
COPY --from=build /app/package.json /app/pnpm-workspace.yaml ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/contracts ./packages/contracts
COPY --from=build /app/apps/api/package.json ./apps/api/package.json
COPY --from=build /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=build /app/apps/api/prisma ./apps/api/prisma
COPY --from=build /app/apps/api/dist ./apps/api/dist
WORKDIR /app/apps/api
USER node
EXPOSE 3310
CMD ["node", "dist/main.js"]

# ---------- web: ban standalone cua Next ----------
FROM node:22-bookworm-slim AS web
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3300 HOSTNAME=0.0.0.0
WORKDIR /app
COPY --from=build --chown=node:node /app/apps/web/.next/standalone ./
COPY --from=build --chown=node:node /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=node:node /app/apps/web/public ./apps/web/public
USER node
EXPOSE 3300
CMD ["node", "apps/web/server.js"]
