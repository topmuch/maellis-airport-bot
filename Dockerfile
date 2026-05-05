# ─── Build Stage ─────────────────────────────────────────────────────
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json bun.lock* package-lock.json* ./
RUN \
  if [ -f bun.lock ]; then \
    corepack enable && bun install --frozen-lockfile; \
  elif [ -f package-lock.json ]; then \
    npm ci; \
  else \
    npm install; \
  fi

# ─── Build Stage ─────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build Next.js — must use npx (not bun) so NODE_OPTIONS are respected
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS="--max-old-space-size=4096"
RUN npx next build

# ─── Production Stage ────────────────────────────────────────────────
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy standalone output
COPY --from=builder /app/.next/standalone ./

# Copy static assets
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/static ./.next/static

# Copy Prisma schema and DB for SQLite
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/db ./db

# Copy seed script
COPY --from=builder /app/scripts ./scripts

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
