#!/usr/bin/env bash
# cleanup-temp.sh — Remove super-json temporary redirect HTML files
# Usage: cleanup-temp.sh [--dry-run] [--dir DIR]
#
# Defaults to /tmp on Linux/macOS. Removes files matching super-json-*.html.

set -euo pipefail

DRY_RUN=false
TEMP_DIR="/tmp"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run)  DRY_RUN=true; shift ;;
    --dir)      TEMP_DIR="$2"; shift 2 ;;
    *)          echo "Unknown option: $1" >&2; exit 1 ;;
  esac
done

PATTERN="super-json-*.html"
count=0

for f in "$TEMP_DIR"/$PATTERN; do
  [ -e "$f" ] || continue
  count=$((count + 1))
  if [ "$DRY_RUN" = true ]; then
    echo "[dry-run] would remove: $f"
  else
    rm -f "$f"
    echo "removed: $f"
  fi
done

echo "Total: $count file(s)"
exit 0
