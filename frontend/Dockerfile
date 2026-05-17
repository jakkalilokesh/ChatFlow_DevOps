# ── Stage 1: Build ────────────────────────────────────────
FROM node:18.20.3-alpine AS builder

WORKDIR /app

# Install dependencies first (layer caching)
COPY package.json package-lock.json* ./
# npm ci installs devDeps by default (needed for react-scripts build)
RUN npm ci 2>/dev/null || npm install

# Copy source and build
COPY public/ ./public/
COPY src/ ./src/
ENV GENERATE_SOURCEMAP=false \
    NODE_ENV=production
RUN npm run build

# ── Stage 2: Serve with Nginx ─────────────────────────────
FROM nginx:1.27.0-alpine

# Security: create non-root user
RUN addgroup -g 1001 -S appgroup && \
    adduser -S -D -H -u 1001 -G appgroup appuser

# Copy built assets
COPY --from=builder /app/build /usr/share/nginx/html

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Adjust permissions so non-root nginx can run
RUN chown -R appuser:appgroup /usr/share/nginx/html && \
    chown -R appuser:appgroup /var/cache/nginx && \
    chown -R appuser:appgroup /var/log/nginx && \
    touch /var/run/nginx.pid && \
    chown appuser:appgroup /var/run/nginx.pid && \
    # nginx needs to write to /tmp for temp files when non-root
    chown -R appuser:appgroup /etc/nginx/conf.d

HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
    CMD wget -qO- http://localhost:3000/health || exit 1

EXPOSE 3000

USER appuser

CMD ["nginx", "-g", "daemon off;"]
