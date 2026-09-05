#!/usr/bin/env bash
# Nightly: `pg_dump -Fc` of the database and a tar of the photos volume into /var/backups/dex, 14 days kept,
# rsync to BACKUP_TARGET (deploy/.env) when set. Cron line in deploy/README.md. Restore: README §♻️.
set -euo pipefail
cd "$(dirname "$0")/.."
COMPOSE="docker compose -f deploy/compose.yml"
OUT="${BACKUP_DIR:-/var/backups/dex}"
KEEP_DAYS="${KEEP_DAYS:-14}"
STAMP="$(date +%Y%m%d-%H%M%S)"
[ -f deploy/.env ] && BACKUP_TARGET="${BACKUP_TARGET:-$(grep -E '^BACKUP_TARGET=' deploy/.env | cut -d= -f2- || true)}"

mkdir -p "$OUT"
$COMPOSE exec -T db pg_dump -U dex -Fc dex > "$OUT/db-$STAMP.dump"
$COMPOSE exec -T app tar cz -C /data/photos . > "$OUT/photos-$STAMP.tgz"
find "$OUT" -type f \( -name 'db-*.dump' -o -name 'photos-*.tgz' \) -mtime +"$KEEP_DAYS" -delete
if [ -n "${BACKUP_TARGET:-}" ]; then
  rsync -az --delete "$OUT/" "$BACKUP_TARGET"
fi
ls -lh "$OUT" | tail -n +2
