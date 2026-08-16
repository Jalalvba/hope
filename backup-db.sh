#!/bin/bash
#
# MongoDB backup for the `hope` database (patterns, analyses, RAG reference data).
#
# backup.sh archives CODE only. This script archives DATA. They are deliberately
# separate: a network or Atlas failure here must not break a code backup.
#
# What gets backed up: the entire database named by MONGODB_DB — every
# collection, including psy (patterns + analyses), ryl and fields (neither of
# which can be reseeded from this repo) and hp.
#
# ─── RESTORE ─────────────────────────────────────────────────────────────────
#
# Full restore, overwriting the live database (DESTRUCTIVE — --drop replaces
# each collection in the archive as it is restored):
#
#   MONGODB_URI=$(grep '^MONGODB_URI=' .env.local | cut -d= -f2-)
#   mongorestore --uri="$MONGODB_URI" --gzip --drop \
#     --archive=~/backups/hope-db-YYYYMMDD-HHMMSS.archive.gz
#
# Safer: restore into a scratch database, then copy out only what you need.
# This never touches the live `hope` database:
#
#   mongorestore --uri="$MONGODB_URI" --gzip \
#     --archive=~/backups/hope-db-YYYYMMDD-HHMMSS.archive.gz \
#     --nsFrom='hope.*' --nsTo='hope_restore.*'
#
#   # then, e.g. recover a single pattern:
#   mongosh "$MONGODB_URI" --eval '
#     const doc = db.getSiblingDB("hope_restore").psy.findOne({ id: "P17" });
#     db.getSiblingDB("hope").psy.replaceOne({ id: "P17" }, doc, { upsert: true });
#   '
#
#   # clean up when done:
#   mongosh "$MONGODB_URI" --eval 'db.getSiblingDB("hope_restore").dropDatabase()'
#
# Inspect an archive without restoring anything:
#
#   mongorestore --gzip --archive=<file> --dryRun -v 2>&1 | grep 'restoring'
#
# ──────────────────────────────────────────────────────────────────────────────

set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$REPO_DIR/.env.local"
DEST_DIR="$HOME/backups"
KEEP=14

# Read the two vars we need without sourcing .env.local — sourcing would execute
# whatever is in that file, and it is not a shell script.
read_env() {
  local key="$1"
  sed -n "s/^${key}=//p" "$ENV_FILE" | head -1 | sed 's/^["'\'']//; s/["'\'']$//'
}

if [ ! -f "$ENV_FILE" ]; then
  echo "✗ $ENV_FILE not found — cannot read the connection string." >&2
  exit 1
fi

if ! command -v mongodump >/dev/null 2>&1; then
  echo "✗ mongodump not found. Install the MongoDB Database Tools:" >&2
  echo "    https://www.mongodb.com/docs/database-tools/installation/" >&2
  exit 1
fi

MONGODB_URI="$(read_env MONGODB_URI)"
MONGODB_DB="$(read_env MONGODB_DB)"

if [ -z "$MONGODB_URI" ] || [ -z "$MONGODB_DB" ]; then
  echo "✗ MONGODB_URI or MONGODB_DB missing from $ENV_FILE — refusing to run." >&2
  exit 1
fi

mkdir -p "$DEST_DIR"
STAMP="$(date +%Y%m%d-%H%M%S)"
ARCHIVE="$DEST_DIR/hope-db-$STAMP.archive.gz"

echo "→ Dumping database '$MONGODB_DB' …"

# mongodump's progress/error output is deliberately NOT suppressed with
# --quiet: when a run fails, the reason has to reach the log, or the log is
# useless. The extra progress lines are worth it.
#
# Note: the URI carries inline credentials and mongodump only accepts it as an
# argument, so it is briefly visible in `ps` output to other users on this
# machine. Accepted tradeoff on a single-user desktop.
if ! mongodump \
  --uri="$MONGODB_URI" \
  --db="$MONGODB_DB" \
  --archive="$ARCHIVE" \
  --gzip; then
  echo "✗ mongodump failed — no usable backup was written." >&2
  rm -f "$ARCHIVE"
  exit 1
fi

# A mongodump that exits 0 but leaves a truncated or empty file is the classic
# silent backup failure. Verify the archive is real before trusting it.
if [ ! -s "$ARCHIVE" ]; then
  echo "✗ Archive is empty — treating as a failed backup." >&2
  rm -f "$ARCHIVE"
  exit 1
fi

if ! gzip -t "$ARCHIVE" 2>/dev/null; then
  echo "✗ Archive failed a gzip integrity check — treating as a failed backup." >&2
  rm -f "$ARCHIVE"
  exit 1
fi

echo "✓ Backup: $ARCHIVE"
ls -lh "$ARCHIVE" | awk '{print "  size: " $5}'

# ─── Prune, keeping the newest $KEEP archives ────────────────────────────────
mapfile -t OLD < <(ls -1t "$DEST_DIR"/hope-db-*.archive.gz 2>/dev/null | tail -n +$((KEEP + 1)))
if [ ${#OLD[@]} -gt 0 ]; then
  for f in "${OLD[@]}"; do
    rm -f "$f"
    echo "  pruned: $(basename "$f")"
  done
fi

COUNT="$(ls -1 "$DEST_DIR"/hope-db-*.archive.gz 2>/dev/null | wc -l)"
echo "  $COUNT snapshot(s) retained (keeping newest $KEEP)"
