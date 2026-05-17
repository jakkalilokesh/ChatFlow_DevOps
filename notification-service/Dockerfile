# ── Stage 1: Dependencies ─────────────────────────────────
FROM node:18.20.3-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev 2>/dev/null || npm install --omit=dev

# ── Stage 2: Production Image ─────────────────────────────
FROM node:18.20.3-alpine

ENV NODE_ENV=production \
    PORT=3004

RUN addgroup -g 1001 -S appgroup && \
    adduser -S -D -H -u 1001 -G appgroup appuser

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY src/ ./src/
RUN mkdir -p logs && chown -R appuser:appgroup /app

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD wget -qO- http://localhost:3004/health || exit 1

EXPOSE 3004

USER appuser

CMD ["node", "src/app.js"]
