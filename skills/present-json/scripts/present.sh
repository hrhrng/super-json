#!/usr/bin/env bash
# present.sh — Present JSON in Super JSON Editor browser viewer
# Usage: present.sh <json-string-or-file> [--tab NAME] [--hero]
#
# Compresses JSON with gzip+base64url, opens in browser via temp redirect
# HTML, and automatically cleans up the temp file plus any stale ones.

set -euo pipefail

JSON_INPUT=""
TAB_NAME="Result"
HERO=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --hero) HERO="&h=1"; shift ;;
    --tab)  TAB_NAME="$2"; shift 2 ;;
    *)
      if [ -z "$JSON_INPUT" ]; then
        JSON_INPUT="$1"
      fi
      shift
      ;;
  esac
done

if [ -z "$JSON_INPUT" ]; then
  echo "Usage: present.sh <json-string-or-file> [--tab NAME] [--hero]" >&2
  exit 1
fi

# Read from file if it exists, otherwise treat as inline JSON
if [ -f "$JSON_INPUT" ]; then
  COMPRESSED=$(gzip -9 < "$JSON_INPUT" | base64 | tr '+/' '-_' | tr -d '=\n')
else
  COMPRESSED=$(echo -n "$JSON_INPUT" | gzip -9 | base64 | tr '+/' '-_' | tr -d '=\n')
fi

# URL-encode the tab name (spaces → %20)
ENCODED_TAB=$(echo -n "$TAB_NAME" | sed 's/ /%20/g')

URL="https://hrhrng.github.io/super-json?c=${COMPRESSED}&t=${ENCODED_TAB}${HERO}"

# Create temp redirect HTML
TMPFILE="/tmp/super-json-$(cat /proc/sys/kernel/random/uuid 2>/dev/null | cut -c1-8 || head -c 4 /dev/urandom | od -A n -t x1 | tr -d ' \n' | head -c 8 || echo $$).html"
printf '<html><head><meta http-equiv="refresh" content="0;url=%s"><script>location.href="%s"</script></head></html>' "$URL" "$URL" > "$TMPFILE"

# Open in browser
open "$TMPFILE" 2>/dev/null || xdg-open "$TMPFILE" 2>/dev/null || echo "$URL"

# Cleanup: delete this temp file + any stale super-json-*.html after delay
(sleep 5 && rm -f /tmp/super-json-*.html) &

echo "$URL"
