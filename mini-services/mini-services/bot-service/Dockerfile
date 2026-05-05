# =============================================================================
# MAELLIS Airport Bot Service — Production Dockerfile
# =============================================================================
FROM oven/bun:1-alpine AS base

WORKDIR /app

# Install dependencies
COPY package.json ./
RUN bun install --frozen-lockfile --production

# Copy source code
COPY . .

# Expose port
EXPOSE 3005

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3005/health || exit 1

# Run as non-root user
RUN addgroup --system --gid 1001 botuser && \
    adduser --system --uid 1001 botuser
USER botuser

CMD ["bun", "index.ts"]
