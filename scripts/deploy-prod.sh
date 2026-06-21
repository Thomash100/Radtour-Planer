#!/bin/bash
set -euo pipefail

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
ENV_FILE=".env"
ENV_EXAMPLE=".env.production.example"
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

if ! command -v docker >/dev/null 2>&1; then
  echo "Fehler: Docker ist nicht installiert."
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "Fehler: Docker Compose Plugin ist nicht installiert."
  exit 1
fi

if [ ! -f "$ENV_FILE" ]; then
  cp "$ENV_EXAMPLE" "$ENV_FILE"
  echo ".env wurde aus $ENV_EXAMPLE erstellt."
  echo "Bitte .env bearbeiten: POSTGRES_PASSWORD, APP_DOMAIN und NEXT_PUBLIC_APP_URL setzen."
  exit 1
fi

echo "Aktualisiere Repository von Branch: $BRANCH"
git fetch origin "$BRANCH"
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"

echo "Baue Produktions-Container..."
docker compose -f "$COMPOSE_FILE" build --pull

echo "Starte Produktions-Stack..."
docker compose -f "$COMPOSE_FILE" up -d --remove-orphans

echo "Warte auf internen App-Healthcheck..."
HEALTH_OK=0
for _ in $(seq 1 40); do
  if docker compose -f "$COMPOSE_FILE" exec -T app node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" >/dev/null 2>&1; then
    HEALTH_OK=1
    break
  fi
  sleep 3
done

if [ "$HEALTH_OK" -ne 1 ]; then
  echo "Fehler: App-Healthcheck nicht erfolgreich."
  docker compose -f "$COMPOSE_FILE" ps
  docker compose -f "$COMPOSE_FILE" logs --tail=120 app
  exit 1
fi

docker compose -f "$COMPOSE_FILE" ps

APP_URL="$(read_env_value NEXT_PUBLIC_APP_URL)"
APP_URL="${APP_URL:-http://localhost}"

echo "Deployment abgeschlossen."
echo "App: $APP_URL"
echo "Healthcheck: $APP_URL/api/health"
