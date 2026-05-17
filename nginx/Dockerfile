FROM nginx:1.27.0-alpine

RUN addgroup -g 1001 -S appgroup && \
    adduser -S -D -H -u 1001 -G appgroup appuser && \
    chown -R appuser:appgroup /var/cache/nginx && \
    chown -R appuser:appgroup /var/log/nginx && \
    touch /var/run/nginx.pid && \
    chown appuser:appgroup /var/run/nginx.pid

COPY nginx.conf /etc/nginx/nginx.conf

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD wget -qO- http://localhost/health || exit 1

EXPOSE 80

USER appuser

CMD ["nginx", "-g", "daemon off;"]
