#!/bin/bash
set -euo pipefail

COMPOSE_FILE="docker-compose.rpi.yml"
ENV_FILE=".env"
ENV_EXAMPLE=".env.rpi.example"

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
    docker compose -f "$COMPOSE_FILE" logs --tail=80 postgres redis worker
    exit 1
  fi

  echo "App-Healthcheck erfolgreich."
}

wait_for_worker_health() {
  echo "Warte auf Worker-Healthcheck..."
  WORKER_OK=0

  for _ in $(seq 1 60); do
    WORKER_ID="$(docker compose -f "$COMPOSE_FILE" ps -q worker 2>/dev/null || true)"
    if [ -n "$WORKER_ID" ]; then
      WORKER_STATUS="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$WORKER_ID" 2>/dev/null || true)"
      if [ "$WORKER_STATUS" = "healthy" ] || [ "$WORKER_STATUS" = "running" ]; then
        WORKER_OK=1
        break
      fi
    fi
    sleep 5
  done

  if [ "$WORKER_OK" -ne 1 ]; then
    echo "Fehler: Worker wurde nicht healthy/running."
    docker compose -f "$COMPOSE_FILE" ps
    docker compose -f "$COMPOSE_FILE" logs --tail=120 worker
    docker compose -f "$COMPOSE_FILE" logs --tail=80 redis
    exit 1
  fi

  echo "Worker-Healthcheck erfolgreich."
}

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker ist nicht installiert. Installation wird gestartet..."
  sudo apt update
  sudo apt install -y git docker.io docker-compose-plugin
  sudo usermod -aG docker "$USER"
  echo "Docker wurde installiert. Bitte einmal abmelden/anmelden oder neu starten und das Script danach erneut ausfuehren."
  exit 0
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "Docker Compose Plugin fehlt. Installation wird gestartet..."
  sudo apt update
  sudo apt install -y docker-compose-plugin
fi

if [ ! -f "$ENV_FILE" ]; then
  if [ -f "$ENV_EXAMPLE" ]; then
    cp "$ENV_EXAMPLE" "$ENV_FILE"
    echo ".env wurde aus .env.rpi.example erstellt. Bitte POSTGRES_PASSWORD und NEXT_PUBLIC_APP_URL pruefen."
  else
    echo "Fehler: $ENV_EXAMPLE nicht gefunden."
    exit 1
  fi
fi

echo "Baue und starte Radtour-Planer auf dem Raspberry Pi..."
docker compose -f "$COMPOSE_FILE" up --build -d

echo "Status:"
docker compose -f "$COMPOSE_FILE" ps

wait_for_app_health
wait_for_worker_health

echo "Logs der App:"
docker compose -f "$COMPOSE_FILE" logs --tail=80 app
echo "Logs des Workers:"
docker compose -f "$COMPOSE_FILE" logs --tail=80 worker

APP_PORT="$(read_env_value APP_PORT)"
APP_PORT="${APP_PORT:-3000}"
APP_URL="$(read_env_value NEXT_PUBLIC_APP_URL)"

echo "Fertig."
echo "Aufruf direkt auf dem Raspberry Pi: http://localhost:$APP_PORT"
if [ -n "$APP_URL" ]; then
  echo "Aufruf im Heimnetz: $APP_URL"
else
  echo "Aufruf im Heimnetz: http://<rpi-ip>:$APP_PORT"
fi
