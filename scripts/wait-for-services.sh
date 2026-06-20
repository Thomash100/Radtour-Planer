#!/bin/sh
set -eu

wait_for_url() {
  service_name="$1"
  service_url="$2"
  default_port="$3"
  timeout_seconds="$4"
  interval_seconds="${5:-2}"
  started_at="$(date +%s)"

  echo "Waiting for $service_name..."

  while :; do
    if WAIT_FOR_URL="$service_url" WAIT_FOR_DEFAULT_PORT="$default_port" node <<'NODE' >/dev/null 2>&1
const net = require("net");

const rawUrl = process.env.WAIT_FOR_URL;
const defaultPort = Number(process.env.WAIT_FOR_DEFAULT_PORT);

if (!rawUrl) {
  process.exit(1);
}

let parsed;
try {
  parsed = new URL(rawUrl);
} catch {
  process.exit(1);
}

const host = parsed.hostname;
const port = Number(parsed.port || defaultPort);

if (!host || !Number.isFinite(port)) {
  process.exit(1);
}

const socket = net.createConnection({ host, port });
const timeout = setTimeout(() => {
  socket.destroy();
  process.exit(1);
}, 3000);

socket.on("connect", () => {
  clearTimeout(timeout);
  socket.end();
  process.exit(0);
});

socket.on("error", () => {
  clearTimeout(timeout);
  process.exit(1);
});
NODE
    then
      echo "$service_name is reachable."
      return 0
    fi

    now="$(date +%s)"
    elapsed=$((now - started_at))
    if [ "$elapsed" -ge "$timeout_seconds" ]; then
      echo "Timed out waiting for $service_name after ${timeout_seconds}s." >&2
      return 1
    fi

    sleep "$interval_seconds"
  done
}

wait_for_postgres() {
  if [ -z "${DATABASE_URL:-}" ]; then
    echo "DATABASE_URL is not set." >&2
    return 1
  fi

  wait_for_url "Postgres" "$DATABASE_URL" "5432" "${WAIT_FOR_POSTGRES_TIMEOUT:-180}" "${WAIT_FOR_INTERVAL:-2}"
}

wait_for_redis() {
  if [ -z "${REDIS_URL:-}" ]; then
    echo "REDIS_URL is not set." >&2
    return 1
  fi

  wait_for_url "Redis" "$REDIS_URL" "6379" "${WAIT_FOR_REDIS_TIMEOUT:-120}" "${WAIT_FOR_INTERVAL:-2}"
}

case "${1:-all}" in
  postgres)
    wait_for_postgres
    ;;
  redis)
    wait_for_redis
    ;;
  all)
    wait_for_postgres
    wait_for_redis
    ;;
  *)
    echo "Usage: $0 [postgres|redis|all]" >&2
    exit 2
    ;;
esac
