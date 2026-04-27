#!/usr/bin/env bash
# Manual database backup for Chronicles of Lies.
#
# Pulls the public DATABASE URL from Railway (via the Railway CLI) and runs
# pg_dump inside a postgres:18-alpine Docker container so the local machine
# doesn't need a postgres-client install. Writes three files into ./backups/:
#
#   chronicles-YYYYMMDD-HHMMSS.dump          — custom format, compressed (-Fc)
#   chronicles-YYYYMMDD-HHMMSS-schema.sql    — schema-only SQL (readable)
#   chronicles-YYYYMMDD-HHMMSS-data.sql      — plain SQL (readable, restorable)
#
# Restore:
#   docker run --rm -i postgres:18-alpine pg_restore -d "$URL" < chronicles-...dump
#   # or:
#   docker run --rm -i postgres:18-alpine psql "$URL" < chronicles-...-data.sql
#
# Keeps the most recent N dumps in ./backups (default 14, override with
# BACKUP_RETAIN env var) so the folder doesn't grow forever.

set -euo pipefail

cd "$(dirname "$0")/.."

RETAIN="${BACKUP_RETAIN:-14}"
DATE="$(date +%Y%m%d-%H%M%S)"
BACKUP_DIR="backups"
DUMP_FILE="${BACKUP_DIR}/chronicles-${DATE}.dump"
SCHEMA_FILE="${BACKUP_DIR}/chronicles-${DATE}-schema.sql"
DATA_FILE="${BACKUP_DIR}/chronicles-${DATE}-data.sql"

mkdir -p "$BACKUP_DIR"

# Pull the public URL from Railway. Fall back to $DATABASE_URL if already set.
if [ -z "${DATABASE_URL:-}" ]; then
  echo "→ pulling DATABASE_PUBLIC_URL from Railway..."
  DATABASE_URL="$(npx --yes @railway/cli run --service Postgres -- printenv DATABASE_PUBLIC_URL | tail -1)"
fi
if [ -z "$DATABASE_URL" ] || [[ "$DATABASE_URL" != postgresql://* ]]; then
  echo "ERROR: could not resolve DATABASE_URL (got: '${DATABASE_URL}')"
  exit 1
fi

echo "→ pg_dump (custom format, compressed)..."
docker run --rm postgres:18-alpine pg_dump "$DATABASE_URL" \
  --format=custom --compress=9 --no-owner --no-acl > "$DUMP_FILE"

echo "→ pg_dump (schema-only)..."
docker run --rm postgres:18-alpine pg_dump "$DATABASE_URL" \
  --schema-only --no-owner --no-acl > "$SCHEMA_FILE"

echo "→ pg_dump (plain SQL with data)..."
docker run --rm postgres:18-alpine pg_dump "$DATABASE_URL" \
  --no-owner --no-acl > "$DATA_FILE"

# Sanity check — every dump must be non-empty and start with the postgres
# custom-format magic string for the .dump file.
if [ ! -s "$DUMP_FILE" ] || [ ! -s "$SCHEMA_FILE" ] || [ ! -s "$DATA_FILE" ]; then
  echo "ERROR: one or more dump files came out empty"
  ls -la "$BACKUP_DIR"
  exit 1
fi

echo "→ wrote:"
ls -la "$DUMP_FILE" "$SCHEMA_FILE" "$DATA_FILE"

# Retention — keep the newest N triplets, delete the rest.
echo "→ pruning old backups (keeping latest $RETAIN)..."
ls -1t "$BACKUP_DIR"/chronicles-*.dump 2>/dev/null \
  | tail -n +$((RETAIN + 1)) \
  | while read -r f; do
      stamp="${f#"$BACKUP_DIR"/chronicles-}"
      stamp="${stamp%.dump}"
      rm -f "$BACKUP_DIR/chronicles-${stamp}.dump" \
            "$BACKUP_DIR/chronicles-${stamp}-schema.sql" \
            "$BACKUP_DIR/chronicles-${stamp}-data.sql"
      echo "   pruned $stamp"
    done

echo "✓ backup complete"