#!/bin/bash
set -euo pipefail

COMPOSE_FILE="docker-compose.rpi.yml"
BRANCH="${1:-main}"

if [ ! -f "$COMPOSE_FILE" ]; then
  echo "Fehler: $COMPOSE_FILE nicht gefunden. Script bitte im Projektordner ausführen."
  exit 1
fi

echo "Aktualisiere Repository von Branch: $BRANCH"
git fetch origin "$BRANCH"
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"

echo "Baue Container neu und starte Dienste..."
docker compose -f "$COMPOSE_FILE" up --build -d --remove-orphans

echo "Prüfe Dienststatus..."
docker compose -f "$COMPOSE_FILE" ps

echo "App-Logs:"
docker compose -f "$COMPOSE_FILE" logs --tail=80 app

echo "Update abgeschlossen."
