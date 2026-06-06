#!/bin/bash
set -euo pipefail

COMPOSE_FILE="docker-compose.rpi.yml"
ENV_FILE=".env"
BRANCH="${1:-main}"

read_env_value() {
  if [ -f "$ENV_FILE" ]; then
    awk -F= -v key="$1" '$1 == key { sub(/^[^=]*=/, ""); gsub(/^"|"$/, ""); print; exit }' "$ENV_FILE"
  fi
}

wait_for_app_health() {
  echo "Warte auf App-Healthcheck..."
  HEALTH_OK=0

  for _ in $(seq 1 60); do
    if docker compose -f "$COMPOSE_FILE" exec -T app node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" >/dev/null 2>&1; then
      HEALTH_OK=1
      break
    fi
    sleep 5
  done

  if [ "$HEALTH_OK" -ne 1 ]; then
    echo "Fehler: App-Healthcheck nicht erfolgreich."
    docker compose -f "$COMPOSE_FILE" ps
    docker compose -f "$COMPOSE_FILE" logs --tail=120 app
    exit 1
  fi

  echo "App-Healthcheck erfolgreich."
}

if [ ! -f "$COMPOSE_FILE" ]; then
  echo "Fehler: $COMPOSE_FILE nicht gefunden. Script bitte im Projektordner ausfuehren."
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "Fehler: Docker ist nicht installiert."
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "Fehler: Docker Compose Plugin ist nicht installiert."
  exit 1
fi

echo "Aktualisiere Repository von Branch: $BRANCH"
git fetch origin "$BRANCH"
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"

echo "Baue Container neu und starte Dienste..."
docker compose -f "$COMPOSE_FILE" up --build -d --remove-orphans

echo "Pruefe Dienststatus..."
docker compose -f "$COMPOSE_FILE" ps

wait_for_app_health

echo "App-Logs:"
docker compose -f "$COMPOSE_FILE" logs --tail=80 app

echo "Update abgeschlossen."
APP_PORT="$(read_env_value APP_PORT)"
APP_PORT="${APP_PORT:-3000}"
APP_URL="$(read_env_value NEXT_PUBLIC_APP_URL)"

echo "Aufruf direkt auf dem Raspberry Pi: http://localhost:$APP_PORT"
if [ -n "$APP_URL" ]; then
  echo "Aufruf im Heimnetz: $APP_URL"
else
  echo "Aufruf im Heimnetz: http://<rpi-ip>:$APP_PORT"
fi
