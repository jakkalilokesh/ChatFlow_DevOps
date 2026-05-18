FROM node:20-slim AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
# Mediasoup downloads a prebuilt binary on Debian/Ubuntu, saving 5+ minutes of compile time
RUN npm ci 2>/dev/null || npm install

# ── Production stage ──────────────────────────────────────
FROM node:20-slim

RUN groupadd -r appgroup && useradd -r -g appgroup appuser

WORKDIR /app

COPY package.json package-lock.json* ./
COPY --from=builder /app/node_modules ./node_modules
COPY src/ ./src/

RUN mkdir -p logs && chown -R appuser:appgroup /app

# Mediasoup signal port
EXPOSE 3005

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3005/health', (r) => {if (r.statusCode !== 200) process.exit(1)})"

USER appuser

CMD ["node", "src/app.js"]
