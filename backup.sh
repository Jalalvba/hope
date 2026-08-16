#!/bin/bash
# Archives this repo's CODE. Data lives in MongoDB and is archived separately by
# backup-db.sh, which writes hope-db-*.archive.gz to the same folder.
cd ~/hope
mkdir -p ~/backups
tar -czf ~/backups/hope-backup-$(date +%Y%m%d).tar.gz \
  --exclude='.env.local' \
  --exclude='.env' \
  --exclude='node_modules' \
  --exclude='.next' \
  --exclude='*.tar.gz' \
  --exclude='.git' \
  --exclude='ryl_database.json' \
  --exclude='mct_database.json' \
  --exclude='seed-knowledge.js' \
  --exclude='seed-fields.js' \
  --exclude='backup.sh' \
  .
echo "✓ Backup: ~/backups/hope-backup-$(date +%Y%m%d).tar.gz"
ls -lh ~/backups/hope-backup-$(date +%Y%m%d).tar.gz
