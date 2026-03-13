# test-cleanup.ps1 — Verify cleanup-temp.ps1 works correctly on Windows
# Creates temp files, runs cleanup, asserts they're removed.

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$TestDir = Join-Path $env:TEMP "super-json-test-$(Get-Random)"
New-Item -ItemType Directory -Path $TestDir -Force | Out-Null

$Pass = 0
$Fail = 0

function Pass($msg) { $script:Pass++; Write-Host "  PASS: $msg" }
function Fail($msg) { $script:Fail++; Write-Host "  FAIL: $msg" }

Write-Host "=== Test: cleanup-temp.ps1 ==="
Write-Host "Using temp dir: $TestDir"

# --- Test 1: removes matching files ---
Write-Host ""
Write-Host "Test 1: removes super-json-*.html files"
New-Item -ItemType File -Path "$TestDir\super-json-aabbccdd.html" -Force | Out-Null
New-Item -ItemType File -Path "$TestDir\super-json-11223344.html" -Force | Out-Null

& "$ScriptDir\cleanup-temp.ps1" -Dir $TestDir

if (-not (Test-Path "$TestDir\super-json-aabbccdd.html") -and
    -not (Test-Path "$TestDir\super-json-11223344.html")) {
    Pass "matching files removed"
} else {
    Fail "matching files still exist"
}

# --- Test 2: does not remove non-matching files ---
Write-Host ""
Write-Host "Test 2: preserves non-matching files"
New-Item -ItemType File -Path "$TestDir\other-file.html" -Force | Out-Null
New-Item -ItemType File -Path "$TestDir\super-json-12345678.txt" -Force | Out-Null

& "$ScriptDir\cleanup-temp.ps1" -Dir $TestDir

if ((Test-Path "$TestDir\other-file.html") -and
    (Test-Path "$TestDir\super-json-12345678.txt")) {
    Pass "non-matching files preserved"
} else {
    Fail "non-matching files were removed"
}

# --- Test 3: dry-run does not delete ---
Write-Host ""
Write-Host "Test 3: -DryRun preserves files"
New-Item -ItemType File -Path "$TestDir\super-json-dryrun01.html" -Force | Out-Null

& "$ScriptDir\cleanup-temp.ps1" -DryRun -Dir $TestDir

if (Test-Path "$TestDir\super-json-dryrun01.html") {
    Pass "-DryRun preserved files"
} else {
    Fail "-DryRun deleted files"
}

# --- Test 4: no files is not an error ---
Write-Host ""
Write-Host "Test 4: empty directory succeeds"
Get-ChildItem -Path $TestDir -Filter "super-json-*.html" | Remove-Item -Force
& "$ScriptDir\cleanup-temp.ps1" -Dir $TestDir
Pass "no error on empty directory"

# --- Cleanup ---
Remove-Item -Recurse -Force $TestDir

Write-Host ""
Write-Host "=== Results: $Pass passed, $Fail failed ==="
if ($Fail -gt 0) { exit 1 }
