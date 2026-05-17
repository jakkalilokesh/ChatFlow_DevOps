# mediasoup requires build tools (python3, make, g++) to compile native bindings
FROM node:20-alpine AS deps

RUN apk add --no-cache python3 py3-pip make g++ linux-headers

WORKDIR /app

COPY package.json package-lock.json* ./
# Use npm ci for reproducible builds; mediasoup must be installed with devDeps
RUN npm ci 2>/dev/null || npm install

# ── Production stage ──────────────────────────────────────
FROM node:20-alpine

# Still need runtime libs for mediasoup compiled natives
RUN apk add --no-cache libstdc++

RUN addgroup -g 1001 -S appgroup && \
    adduser -S -D -H -u 1001 -G appgroup appuser

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY src/ ./src/

RUN mkdir -p logs && chown -R appuser:appgroup /app

# Mediasoup signal port; UDP range is exposed but mapped by host network or k8s
EXPOSE 3005

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD wget -qO- http://localhost:3005/health || exit 1

USER appuser

CMD ["node", "src/app.js"]
