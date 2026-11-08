# syntax=docker/dockerfile:1

# Two images come out of this file, built from the same commit:
#
#   (default)         the app: a Next.js standalone server and nothing else
#   --target migrate   a one-off job image that runs `prisma migrate deploy`
#
# The Prisma CLI is large and only needed for the seconds a migration takes, so
# it lives in its own image instead of the running app. The deploy builds and
# pushes both with the same tag, so a migration and the code that needs it
# always ship together.

ARG NODE_VERSION=24

# ---- dependencies ----------------------------------------------------------
FROM node:${NODE_VERSION}-alpine AS deps
RUN npm install -g pnpm@12.18.0
WORKDIR /app
ENV HUSKY=0
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# ---- build -----------------------------------------------------------------
FROM deps AS build
WORKDIR /app

# Real, non-secret values for the target environment: NEXT_PUBLIC_* is inlined
# into the browser bundle, and next.config.ts allows the photo host from the
# S3_* values.
ARG NEXT_PUBLIC_APP_URL=http://localhost:3000
ARG NEXT_PUBLIC_GA_ID=
ARG S3_BUCKET=build-placeholder-bucket
ARG S3_REGION=us-east-1
ARG S3_PUBLIC_URL=
ENV NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL} \
    NEXT_PUBLIC_GA_ID=${NEXT_PUBLIC_GA_ID} \
    S3_BUCKET=${S3_BUCKET} \
    S3_REGION=${S3_REGION} \
    S3_PUBLIC_URL=${S3_PUBLIC_URL}

# Placeholders only. `next build` loads route modules that read the validated
# environment, which needs *a* value to start. None of these reach the runtime
# stages (they are separate FROMs); the real ones arrive from the task
# definition when the container runs.
ENV DATABASE_URL=postgresql://build:build@localhost:5432/build \
    SMTP_URL=smtp://localhost:1025 \
    EMAIL_FROM=build@example.com \
    BETTER_AUTH_SECRET=build-placeholder-secret-not-used-at-runtime \
    GOOGLE_CLIENT_ID=build.apps.googleusercontent.com \
    GOOGLE_CLIENT_SECRET=build-placeholder \
    STRIPE_SECRET_KEY=sk_test_build_placeholder \
    STRIPE_WEBHOOK_SECRET=whsec_build_placeholder \
    NEXT_TELEMETRY_DISABLED=1

COPY . .
RUN pnpm db:generate && pnpm build

# Pin the migration tooling to exactly the versions the app was built with.
RUN mkdir /migrate && node -e '\
const v = (p) => require(`${p}/package.json`).version; \
require("fs").writeFileSync("/migrate/package.json", JSON.stringify({ \
  private: true, \
  dependencies: { prisma: v("prisma"), dotenv: v("dotenv") } \
}))'

# ---- migrate: one-off `prisma migrate deploy` job --------------------------
FROM node:${NODE_VERSION}-alpine AS migrate
# openssl: Prisma's schema engine links against it.
RUN apk add --no-cache openssl
ENV NODE_ENV=production
WORKDIR /opt/migrate
COPY --from=build /migrate/package.json ./package.json
RUN npm install --omit=dev --no-audit --no-fund \
    && npm cache clean --force \
    && rm -rf /root/.npm /tmp/*
COPY prisma ./prisma
COPY prisma.config.ts ./prisma.config.ts
USER node
CMD ["./node_modules/.bin/prisma", "migrate", "deploy"]

# ---- app (default target) --------------------------------------------------
FROM node:${NODE_VERSION}-alpine AS runner
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

WORKDIR /app
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# Fargate (and other orchestrators) set HOSTNAME to the container's own name, which
# the server would try to listen on; the address to listen on is set here instead.
CMD ["sh", "-c", "HOSTNAME=0.0.0.0 exec node server.js"]
