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

if [ ! -f "$COMPOSE_FILE" ]; then
  echo "Fehler: $COMPOSE_FILE nicht gefunden. Script bitte im Projektordner ausfuehren."
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
