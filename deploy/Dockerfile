# ── Bloods Hub Bot — runtime image ─────────────────────────────────────────
#  Multi-stage build: 1) install prod deps, 2) slim runtime.
FROM node:20-bookworm-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev --no-audit --no-fund

FROM node:20-bookworm-slim AS runtime
WORKDIR /app

# Tini for proper signal handling (graceful shutdown).
ENV NODE_ENV=production \
    LOG_LEVEL=info
RUN apt-get update && apt-get install -y --no-install-recommends tini ca-certificates && \
    rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./
COPY src ./src
COPY db ./db

# Logs volume (winston daily-rotate)
RUN mkdir -p /app/logs
VOLUME ["/app/logs"]

USER node
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "src/index.js"]
