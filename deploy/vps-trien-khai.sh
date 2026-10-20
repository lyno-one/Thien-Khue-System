#!/usr/bin/env bash
# Trien khai Thien Khue S tren VPS sau khi da git pull (goi tu .github/workflows/deploy-vps.yml hoac chay tay).
# Build -> ap migration schema thien_khue (chi `migrate deploy`, KHONG reset) -> up -d -> doi api healthy.
set -euo pipefail
cd "$(dirname "$0")"

echo "== build"
docker compose build

echo "== migrate deploy (schema thien_khue)"
docker compose run --rm api node_modules/.bin/prisma migrate deploy

echo "== up"
docker compose up -d

API_PORT="$(grep -E '^API_PORT=' .env 2>/dev/null | cut -d= -f2 || true)"
API_PORT="${API_PORT:-3310}"
for lan in $(seq 1 30); do
  if curl --fail --silent --max-time 5 "http://127.0.0.1:${API_PORT}/api/health" -o /dev/null; then
    docker image prune -f >/dev/null
    echo "THIEN_KHUE_DEPLOYED"
    exit 0
  fi
  sleep 3
done
echo "api khong healthy sau 90s — xem: docker compose logs --tail=200 api web" >&2
exit 1
