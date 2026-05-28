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

echo "Logs der App:"
docker compose -f "$COMPOSE_FILE" logs --tail=80 app

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
