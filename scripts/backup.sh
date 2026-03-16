#!/bin/bash
tar -czf ~/Downloads/hope-backup-$(date +%Y%m%d).tar.gz \
  --exclude='.env*' \
  --exclude='node_modules' \
  --exclude='.next' \
  --exclude='*.json' \
  --exclude='hope@0.1.0' \
  --exclude='next' \
  --exclude='.git' \
  -C ~ hope
echo "Backup saved to ~/Downloads/hope-backup-$(date +%Y%m%d).tar.gz"
