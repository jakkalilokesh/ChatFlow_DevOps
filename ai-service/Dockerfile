# ── Stage 1: Dependencies ─────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev 2>/dev/null || npm install --omit=dev

# ── Stage 2: Production Image ─────────────────────────────
FROM node:20-alpine

ENV NODE_ENV=production \
    AI_SERVICE_PORT=3006

RUN addgroup -g 1001 -S appgroup && \
    adduser -S -D -H -u 1001 -G appgroup appuser

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY src/ ./src/

RUN mkdir -p logs && chown -R appuser:appgroup /app

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3006/health', (r) => { if (r.statusCode !== 200) process.exit(1) }).on('error', () => process.exit(1))"

EXPOSE 3006

USER appuser

CMD ["node", "src/app.js"]
