#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
docker compose build web
docker compose up -d --no-deps web
for attempt in {1..15}; do
  if curl --fail --silent --show-error --max-time 10 http://127.0.0.1:3400/ -o /dev/null; then
    echo 'LYNOOS_WEB_DEPLOYED'
    exit 0
  fi
  sleep 2
done
echo 'Web readiness check failed; inspect docker compose logs web.' >&2
exit 1
