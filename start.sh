#!/usr/bin/env bash

set -Eeuo pipefail

PROJECT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_ENV_FILE="$PROJECT_DIR/backend/.env"
FRONTEND_ENV_FILE="$PROJECT_DIR/frontend/.env"
ML_ENV_FILE="$PROJECT_DIR/ml-service/.env"
ML_VENV="$PROJECT_DIR/ml-service/.venv"

BACKEND_URL="${BACKEND_URL:-http://localhost:8080}"
ML_PORT="${ML_PORT:-8000}"
FRONTEND_PORT="${FRONTEND_PORT:-5173}"

declare -a SERVICE_PIDS=()

log() {
  printf '[IsoGuard] %s\n' "$*"
}

fail() {
  printf '[IsoGuard] Error: %s\n' "$*" >&2
  exit 1
}

cleanup() {
  local exit_code=$?
  trap - EXIT INT TERM

  if ((${#SERVICE_PIDS[@]} > 0)); then
    log "Stopping services..."
    kill "${SERVICE_PIDS[@]}" 2>/dev/null || true
    wait "${SERVICE_PIDS[@]}" 2>/dev/null || true
  fi

  exit "$exit_code"
}

trap cleanup EXIT INT TERM

[[ -f "$BACKEND_ENV_FILE" ]] ||
  fail "Missing backend/.env. Copy backend/.env.example to backend/.env and configure it."
[[ -f "$FRONTEND_ENV_FILE" ]] ||
  fail "Missing frontend/.env. Copy frontend/.env.example to frontend/.env and configure it."
[[ -f "$ML_ENV_FILE" ]] ||
  fail "Missing ml-service/.env. Copy ml-service/.env.example to ml-service/.env and configure it."

APP_NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
if [[ -s "$APP_NVM_DIR/nvm.sh" ]]; then
  export NVM_DIR="$APP_NVM_DIR"
  # shellcheck disable=SC1091
  source "$NVM_DIR/nvm.sh"
  nvm use 22 >/dev/null || fail "Node.js 22 is not installed in NVM."
fi

command -v dotnet >/dev/null 2>&1 || fail ".NET 8 SDK is not installed or not available in PATH."
command -v npm >/dev/null 2>&1 || fail "npm is not installed or not available in PATH."
[[ -x "$ML_VENV/bin/python" ]] ||
  fail "Missing ML virtual environment. Create it at ml-service/.venv and install requirements."
[[ -d "$PROJECT_DIR/frontend/node_modules" ]] ||
  fail "Frontend dependencies are missing. Run: cd frontend && npm install"

log "Starting ML service on http://localhost:$ML_PORT"
(
  cd "$PROJECT_DIR/ml-service"
  set -a
  # shellcheck disable=SC1091
  source "$ML_ENV_FILE"
  set +a
  exec "$ML_VENV/bin/python" -m uvicorn \
    app.main:app --reload --port "$ML_PORT"
) &
SERVICE_PIDS+=("$!")

log "Starting backend on $BACKEND_URL"
(
  cd "$PROJECT_DIR/backend"
  set -a
  # shellcheck disable=SC1091
  source "$BACKEND_ENV_FILE"
  set +a
  # Restore automatically when a clean workspace has no obj/project.assets.json.
  exec dotnet run --urls "$BACKEND_URL"
) &
SERVICE_PIDS+=("$!")

log "Starting frontend on http://localhost:$FRONTEND_PORT"
(
  cd "$PROJECT_DIR/frontend"
  exec npm run dev -- --port "$FRONTEND_PORT"
) &
SERVICE_PIDS+=("$!")

log "IsoGuard is starting."
log "Frontend: http://localhost:$FRONTEND_PORT"
log "Backend:  $BACKEND_URL"
log "ML API:   http://localhost:$ML_PORT"
log "Press Ctrl+C to stop all services."

set +e
wait -n "${SERVICE_PIDS[@]}"
service_status=$?
set -e

if ((service_status == 0)); then
  log "A service stopped. Shutting down the remaining services."
else
  printf '[IsoGuard] A service exited with status %d. Shutting down.\n' "$service_status" >&2
fi

exit "$service_status"
