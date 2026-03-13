#!/usr/bin/env bash
# test-open-json.sh — Verify open-json.sh URL generation and temp file cleanup
# Stubs out browser open commands so nothing actually opens.

set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SCRIPT="$REPO_DIR/skills/present-json/scripts/open-json.sh"
PASS=0
FAIL=0

pass() { PASS=$((PASS + 1)); echo "  PASS: $1"; }
fail() { FAIL=$((FAIL + 1)); echo "  FAIL: $1"; }

echo "=== Test: open-json.sh ==="

# --- Test 1: generates valid URL from inline JSON ---
echo ""
echo "Test 1: inline JSON produces URL with ?c= parameter"

# Stub open/xdg-open so the script doesn't try to open a browser
export PATH="$REPO_DIR/tests/stubs:$PATH"
mkdir -p "$REPO_DIR/tests/stubs"
echo '#!/bin/sh' > "$REPO_DIR/tests/stubs/open"
echo 'exit 0' >> "$REPO_DIR/tests/stubs/open"
chmod +x "$REPO_DIR/tests/stubs/open"
cp "$REPO_DIR/tests/stubs/open" "$REPO_DIR/tests/stubs/xdg-open"

URL=$(bash "$SCRIPT" '{"hello":"world"}' --tab "Test")
if echo "$URL" | grep -q 'hrhrng.github.io/super-json?c='; then
  pass "URL contains compressed parameter"
else
  fail "URL missing ?c= parameter: $URL"
fi

# --- Test 2: generates URL from file ---
echo ""
echo "Test 2: file input produces URL"
TMPJSON=$(mktemp /tmp/test-input-XXXXXX.json)
echo '{"from":"file"}' > "$TMPJSON"

URL=$(bash "$SCRIPT" "$TMPJSON" --tab "FileTest")
rm -f "$TMPJSON"

if echo "$URL" | grep -q 'hrhrng.github.io/super-json?c='; then
  pass "file input produced valid URL"
else
  fail "file input URL invalid: $URL"
fi

# --- Test 3: --hero appends h=1 ---
echo ""
echo "Test 3: --hero flag adds h=1"
URL=$(bash "$SCRIPT" '{"hero":true}' --tab "Hero" --hero)

if echo "$URL" | grep -q '&h=1'; then
  pass "--hero appended h=1"
else
  fail "--hero missing h=1: $URL"
fi

# --- Test 4: tab name is in URL ---
echo ""
echo "Test 4: tab name encoded in URL"
URL=$(bash "$SCRIPT" '{}' --tab "My Tab")

if echo "$URL" | grep -q 't=My%20Tab'; then
  pass "tab name encoded correctly"
else
  fail "tab name not found in URL: $URL"
fi

# --- Test 5: temp file gets cleaned up ---
echo ""
echo "Test 5: temp file deleted after delay"
# Count super-json temp files before and after
BEFORE=$(find /tmp -maxdepth 1 -name 'super-json-*.html' 2>/dev/null | wc -l | tr -d ' ')
bash "$SCRIPT" '{"cleanup":"test"}' --tab "Cleanup" > /dev/null 2>&1
# Wait for background cleanup
sleep 7
AFTER=$(find /tmp -maxdepth 1 -name 'super-json-*.html' 2>/dev/null | wc -l | tr -d ' ')

if [ "$AFTER" -le "$BEFORE" ]; then
  pass "temp file cleaned up"
else
  fail "temp file still exists (before=$BEFORE, after=$AFTER)"
fi

# --- Cleanup stubs ---
rm -rf "$REPO_DIR/tests/stubs"

echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="
[ "$FAIL" -eq 0 ] || exit 1
