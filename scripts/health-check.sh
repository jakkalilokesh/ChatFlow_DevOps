#!/usr/bin/env bash
# scripts/health-check.sh  — Verify all services are healthy in a namespace
# Usage: ./scripts/health-check.sh <namespace>
set -euo pipefail

NAMESPACE="${1:-production}"
RETRIES="${2:-20}"
SLEEP="${3:-10}"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }
err() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $*" >&2; }

SERVICES=(
  "auth-service:3001"
  "chat-service:3002"
  "user-service:3003"
  "notification-service:3004"
  "frontend:3000"
)

log "=== ChatFlow Health Check ==="
log "Namespace: ${NAMESPACE}"
kubectl config set-cluster default --insecure-skip-tls-verify=true --kubeconfig="$KUBECONFIG" 2>/dev/null || true

# Check pods are all Running
log "Checking pod status..."
for i in $(seq 1 "${RETRIES}"); do
  NOT_READY=$(kubectl get pods -n "${NAMESPACE}" --no-headers 2>/dev/null | \
    grep -v "Running\|Completed" | wc -l)
  if [ "${NOT_READY}" -eq 0 ]; then
    log "  ✓ All pods are Running"
    break
  fi
  if [ "${i}" -eq "${RETRIES}" ]; then
    err "Pods not ready after ${RETRIES} attempts:"
    kubectl get pods -n "${NAMESPACE}"
    exit 1
  fi
  log "  Waiting for pods... (attempt ${i}/${RETRIES})"
  sleep "${SLEEP}"
done

# Check /health endpoints via kubectl exec
log "Checking service health endpoints..."
FAILED=0
for entry in "${SERVICES[@]}"; do
  SVC="${entry%%:*}"
  PORT="${entry##*:}"
  log "  Checking ${SVC}..."

  POD=$(kubectl get pod -n "${NAMESPACE}" -l "app=${SVC}" -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")
  if [ -z "${POD}" ]; then
    err "  No pod found for ${SVC}"
    FAILED=$((FAILED+1))
    continue
  fi

  RESPONSE=$(kubectl exec "${POD}" -n "${NAMESPACE}" -- \
    wget -qO- "http://localhost:${PORT}/health" 2>/dev/null || echo "FAIL")

  if echo "${RESPONSE}" | grep -q '"status"'; then
    log "  ✓ ${SVC} is healthy"
  else
    err "  ✗ ${SVC} health check failed (response: ${RESPONSE})"
    FAILED=$((FAILED+1))
  fi
done

log "=== Health Check Summary ==="
if [ "${FAILED}" -gt 0 ]; then
  err "${FAILED} service(s) failed health check!"
  exit 1
else
  log "✅ All services are healthy in namespace '${NAMESPACE}'"
fi
