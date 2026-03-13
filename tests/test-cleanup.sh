#!/usr/bin/env bash
# test-cleanup.sh — Verify cleanup-temp.sh works correctly
# Creates temp files, runs cleanup, asserts they're removed.

set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
CLEANUP_SCRIPT="$REPO_DIR/skills/present-json/scripts/cleanup-temp.sh"
TEST_DIR=$(mktemp -d)
PASS=0
FAIL=0

pass() { PASS=$((PASS + 1)); echo "  PASS: $1"; }
fail() { FAIL=$((FAIL + 1)); echo "  FAIL: $1"; }

echo "=== Test: cleanup-temp.sh ==="
echo "Using temp dir: $TEST_DIR"

# --- Test 1: removes matching files ---
echo ""
echo "Test 1: removes super-json-*.html files"
touch "$TEST_DIR/super-json-aabbccdd.html"
touch "$TEST_DIR/super-json-11223344.html"

bash "$CLEANUP_SCRIPT" --dir "$TEST_DIR"

if [ ! -e "$TEST_DIR/super-json-aabbccdd.html" ] && [ ! -e "$TEST_DIR/super-json-11223344.html" ]; then
  pass "matching files removed"
else
  fail "matching files still exist"
fi

# --- Test 2: does not remove non-matching files ---
echo ""
echo "Test 2: preserves non-matching files"
touch "$TEST_DIR/other-file.html"
touch "$TEST_DIR/super-json-12345678.txt"

bash "$CLEANUP_SCRIPT" --dir "$TEST_DIR"

if [ -e "$TEST_DIR/other-file.html" ] && [ -e "$TEST_DIR/super-json-12345678.txt" ]; then
  pass "non-matching files preserved"
else
  fail "non-matching files were removed"
fi

# --- Test 3: dry-run does not delete ---
echo ""
echo "Test 3: --dry-run preserves files"
touch "$TEST_DIR/super-json-dryrun01.html"

bash "$CLEANUP_SCRIPT" --dry-run --dir "$TEST_DIR"

if [ -e "$TEST_DIR/super-json-dryrun01.html" ]; then
  pass "--dry-run preserved files"
else
  fail "--dry-run deleted files"
fi

# --- Test 4: no files is not an error ---
echo ""
echo "Test 4: empty directory succeeds"
rm -f "$TEST_DIR"/super-json-*.html
bash "$CLEANUP_SCRIPT" --dir "$TEST_DIR"
pass "no error on empty directory"

# --- Cleanup ---
rm -rf "$TEST_DIR"

echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="
[ "$FAIL" -eq 0 ] || exit 1
