#!/usr/bin/env bash
# test-present.sh — Verify present.sh: URL generation, hero mode, and cleanup

set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SCRIPT="$REPO_DIR/skills/present-json/scripts/present.sh"
PASS=0
FAIL=0

pass() { PASS=$((PASS + 1)); echo "  PASS: $1"; }
fail() { FAIL=$((FAIL + 1)); echo "  FAIL: $1"; }

# Stub open/xdg-open so the script doesn't launch a browser
mkdir -p "$REPO_DIR/tests/stubs"
printf '#!/bin/sh\nexit 0\n' > "$REPO_DIR/tests/stubs/open"
chmod +x "$REPO_DIR/tests/stubs/open"
cp "$REPO_DIR/tests/stubs/open" "$REPO_DIR/tests/stubs/xdg-open"
export PATH="$REPO_DIR/tests/stubs:$PATH"

echo "=== Test: present.sh ==="

# --- Test 1: inline JSON produces URL with ?c= ---
echo ""
echo "Test 1: inline JSON produces compressed URL"
URL=$(bash "$SCRIPT" '{"hello":"world"}' --tab "Test")
if echo "$URL" | grep -q 'hrhrng.github.io/super-json?c='; then
  pass "URL contains compressed parameter"
else
  fail "URL missing ?c=: $URL"
fi

# --- Test 2: file input ---
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
echo "Test 3: --hero flag"
URL=$(bash "$SCRIPT" '{"hero":true}' --tab "Hero" --hero)
if echo "$URL" | grep -q '&h=1'; then
  pass "--hero appended h=1"
else
  fail "--hero missing h=1: $URL"
fi

# --- Test 4: tab name encoded ---
echo ""
echo "Test 4: tab name in URL"
URL=$(bash "$SCRIPT" '{}' --tab "My Tab")
if echo "$URL" | grep -q 't=My%20Tab'; then
  pass "tab name encoded correctly"
else
  fail "tab name not found: $URL"
fi

# --- Test 5: temp files cleaned up after delay ---
echo ""
echo "Test 5: temp files cleaned up"
# Seed a stale temp file to verify it also gets cleaned
touch /tmp/super-json-stale999.html
BEFORE=$(find /tmp -maxdepth 1 -name 'super-json-*.html' 2>/dev/null | wc -l | tr -d ' ')
bash "$SCRIPT" '{"cleanup":"test"}' --tab "Cleanup" > /dev/null 2>&1
sleep 7
AFTER=$(find /tmp -maxdepth 1 -name 'super-json-*.html' 2>/dev/null | wc -l | tr -d ' ')
if [ "$AFTER" -eq 0 ]; then
  pass "all temp files cleaned up (including stale)"
elif [ "$AFTER" -lt "$BEFORE" ]; then
  pass "temp files reduced ($BEFORE -> $AFTER)"
else
  fail "temp files not cleaned (before=$BEFORE, after=$AFTER)"
fi

# --- Test 6: missing argument exits with error ---
echo ""
echo "Test 6: missing argument exits nonzero"
if bash "$SCRIPT" 2>/dev/null; then
  fail "should have exited nonzero"
else
  pass "exits nonzero without arguments"
fi

# --- Cleanup ---
rm -rf "$REPO_DIR/tests/stubs"

echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="
[ "$FAIL" -eq 0 ] || exit 1
