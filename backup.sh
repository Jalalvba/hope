#!/bin/bash
cd ~/hope
tar -czf ~/Downloads/hope-backup-$(date +%Y%m%d).tar.gz \
  --exclude='.env.local' \
  --exclude='.env' \
  --exclude='node_modules' \
  --exclude='.next' \
  --exclude='*.tar.gz' \
  --exclude='hope@0.1.0' \
  --exclude='next' \
  --exclude='.git' \
  --exclude='ryl_database.json' \
  --exclude='mct_database.json' \
  --exclude='seed-knowledge.js' \
  --exclude='seed-fields.js' \
  --exclude='backup.sh' \
  .
echo "✓ Backup: ~/Downloads/hope-backup-$(date +%Y%m%d).tar.gz"
ls -lh ~/Downloads/hope-backup-$(date +%Y%m%d).tar.gz
