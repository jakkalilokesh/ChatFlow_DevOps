#!/usr/bin/env bash
# scripts/setup.sh  — Full one-command local developer setup
# Usage: ./scripts/setup.sh
set -euo pipefail

log() { echo -e "\033[1;36m[SETUP]\033[0m $*"; }
ok()  { echo -e "\033[1;32m[  OK ]\033[0m $*"; }
err() { echo -e "\033[1;31m[FAIL ]\033[0m $*" >&2; exit 1; }

log "=== ChatFlow Developer Setup ==="
log "This script installs dependencies and spins up the stack via Docker Compose."

# Check required tools
for cmd in docker node npm git; do
  command -v "${cmd}" &>/dev/null || err "${cmd} is required but not found. Please install it first."
  ok "${cmd} found: $(${cmd} --version 2>&1 | head -1)"
done

# Check Docker daemon
docker info &>/dev/null || err "Docker daemon is not running. Please start Docker."
ok "Docker daemon is running"

# Copy .env if not present
if [ ! -f .env ]; then
  log "Creating .env from .env.example..."
  cp .env.example .env
  ok ".env created — please fill in real secrets before deploying to production!"
else
  ok ".env already exists"
fi

# Install frontend dependencies
log "Installing frontend npm dependencies..."
(cd frontend && npm install --prefer-offline) && ok "Frontend deps installed"

# Install backend dependencies
for svc in auth-service chat-service user-service notification-service; do
  log "Installing ${svc} npm dependencies..."
  (cd "${svc}" && npm install --prefer-offline) && ok "${svc} deps installed"
done

# Build and start via Docker Compose
log "Building and starting all services with Docker Compose..."
docker compose build --parallel
docker compose up -d

# Wait for health
log "Waiting for services to become healthy..."
sleep 15

HEALTHY=true
for svc in auth notification-service chat-service user-service; do
  STATUS=$(docker compose ps --format json 2>/dev/null | \
    python3 -c "import sys,json; data=json.load(sys.stdin); print(next((s.get('Health','?') for s in (data if isinstance(data,list) else [data]) if '${svc}' in s.get('Name','')), 'unknown'))" 2>/dev/null || echo "unknown")
  if [ "${STATUS}" = "healthy" ]; then
    ok "chatflow-${svc}: healthy"
  else
    log "chatflow-${svc}: ${STATUS} (may still be starting)"
    HEALTHY=false
  fi
done

echo ""
log "=== Setup complete! ==="
echo ""
echo "  🌐  Frontend:              http://localhost"
echo "  🔐  Auth Service:          http://localhost/auth"
echo "  💬  Chat Service:          http://localhost/api/chat"
echo "  👤  User Service:          http://localhost/api/users"
echo "  🔔  Notification Service:  http://localhost/api/notify"
echo ""
echo "  Logs:  docker compose logs -f"
echo "  Stop:  docker compose down"
echo ""
