#!/usr/bin/env bash
# scripts/rollback.sh  — Roll back all deployments to previous revision
# Usage: ./scripts/rollback.sh <namespace>
set -euo pipefail

NAMESPACE="${1:-production}"

SERVICES=(
  "frontend"
  "auth-service"
  "chat-service"
  "user-service"
  "notification-service"
)

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }
err() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $*" >&2; }

log "=== ChatFlow Rollback to previous revision ==="
log "Namespace: ${NAMESPACE}"

for svc in "${SERVICES[@]}"; do
  log "Rolling back ${svc}..."
  if kubectl rollout undo "deployment/${svc}" -n "${NAMESPACE}" 2>/dev/null; then
    log "  ✓ ${svc} rolled back"
    kubectl rollout status "deployment/${svc}" -n "${NAMESPACE}" --timeout=120s || \
      err "  Rollback status check failed for ${svc}"
  else
    err "  Could not rollback ${svc} (may not exist yet)"
  fi
done

log "=== Rollback complete ==="
kubectl get pods -n "${NAMESPACE}" --no-headers | awk '{printf "  %-40s %s\n", $1, $3}'
