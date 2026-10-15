#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
stamp=$(date +%Y%m%d-%H%M%S)
live=/etc/caddy/Caddyfile
managed=/home/opc/apps/crm/deploy/Caddyfile
if sudo grep -Eq '^lyno\.com\.vn[[:space:]]*\{' "$live"; then
  echo 'Domain block already exists; inspect before changing it.' >&2
  exit 1
fi
candidate=$(mktemp)
trap 'rm -f "$candidate"' EXIT
sudo cat "$live" > "$candidate"
printf '\n' >> "$candidate"
cat Caddyfile.host >> "$candidate"
sudo caddy validate --config "$candidate" --adapter caddyfile
if [ -f "$managed" ] && ! grep -Eq '^lyno\.com\.vn[[:space:]]*\{' "$managed"; then
  cp "$managed" "$managed.bak-$stamp"
  printf '\n' >> "$managed"
  cat Caddyfile.host >> "$managed"
fi
sudo cp "$live" "$live.bak-$stamp"
sudo install -m 644 "$candidate" "$live"
sudo systemctl reload caddy
echo 'Caddy reloaded for lyno.com.vn; backups retained.'
