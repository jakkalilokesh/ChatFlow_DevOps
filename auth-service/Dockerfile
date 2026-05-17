# ── Stage 1: Dependencies ─────────────────────────────────
FROM node:18.20.3-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
# Use npm ci for reproducible installs; falls back to npm install if no lockfile
RUN npm ci --omit=dev 2>/dev/null || npm install --omit=dev

# ── Stage 2: Production Image ─────────────────────────────
FROM node:18.20.3-alpine

ENV NODE_ENV=production \
    PORT=3001

# Security: non-root user
RUN addgroup -g 1001 -S appgroup && \
    adduser -S -D -H -u 1001 -G appgroup appuser

WORKDIR /app

# Copy production deps and source
COPY --from=deps /app/node_modules ./node_modules
COPY src/ ./src/

# Create logs dir with correct ownership BEFORE switching user
RUN mkdir -p logs && chown -R appuser:appgroup /app

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD wget -qO- http://localhost:3001/health || exit 1

EXPOSE 3001

USER appuser

CMD ["node", "src/app.js"]
