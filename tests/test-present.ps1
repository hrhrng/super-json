# test-present.ps1 — Verify present.ps1: URL generation, hero mode, and cleanup

$ErrorActionPreference = "Stop"
$RepoDir = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$Script = Join-Path $RepoDir "skills" "present-json" "scripts" "present.ps1"
$Pass = 0
$Fail = 0

function Pass($msg) { $script:Pass++; Write-Host "  PASS: $msg" }
function Fail($msg) { $script:Fail++; Write-Host "  FAIL: $msg" }

Write-Host "=== Test: present.ps1 ==="

# --- Test 1: inline JSON produces URL with ?c= ---
Write-Host ""
Write-Host "Test 1: inline JSON produces compressed URL"
$url = & "$Script" '{"hello":"world"}' -Tab "Test" 2>&1 | Select-Object -Last 1
if ($url -match 'hrhrng\.github\.io/super-json\?c=') {
    Pass "URL contains compressed parameter"
} else {
    Fail "URL missing ?c=: $url"
}

# --- Test 2: file input ---
Write-Host ""
Write-Host "Test 2: file input produces URL"
$tmpJson = Join-Path $env:TEMP "test-input-$(Get-Random).json"
'{"from":"file"}' | Out-File -Encoding utf8 $tmpJson
$url = & "$Script" $tmpJson -Tab "FileTest" 2>&1 | Select-Object -Last 1
Remove-Item $tmpJson -Force
if ($url -match 'hrhrng\.github\.io/super-json\?c=') {
    Pass "file input produced valid URL"
} else {
    Fail "file input URL invalid: $url"
}

# --- Test 3: -Hero appends h=1 ---
Write-Host ""
Write-Host "Test 3: -Hero flag"
$url = & "$Script" '{"hero":true}' -Tab "Hero" -Hero 2>&1 | Select-Object -Last 1
if ($url -match '&h=1') {
    Pass "-Hero appended h=1"
} else {
    Fail "-Hero missing h=1: $url"
}

# --- Test 4: tab name encoded ---
Write-Host ""
Write-Host "Test 4: tab name in URL"
$url = & "$Script" '{}' -Tab "My Tab" 2>&1 | Select-Object -Last 1
if ($url -match 't=My%20Tab') {
    Pass "tab name encoded correctly"
} else {
    Fail "tab name not found: $url"
}

# --- Test 5: temp files cleaned up after delay ---
Write-Host ""
Write-Host "Test 5: temp files cleaned up"
# Seed a stale temp file
New-Item -ItemType File -Path (Join-Path $env:TEMP "super-json-stale999.html") -Force | Out-Null
$before = @(Get-ChildItem -Path $env:TEMP -Filter "super-json-*.html" -File -ErrorAction SilentlyContinue).Count
& "$Script" '{"cleanup":"test"}' -Tab "Cleanup" 2>&1 | Out-Null
Start-Sleep -Seconds 7
$after = @(Get-ChildItem -Path $env:TEMP -Filter "super-json-*.html" -File -ErrorAction SilentlyContinue).Count
if ($after -eq 0) {
    Pass "all temp files cleaned up (including stale)"
} elseif ($after -lt $before) {
    Pass "temp files reduced ($before -> $after)"
} else {
    Fail "temp files not cleaned (before=$before, after=$after)"
}

Write-Host ""
Write-Host "=== Results: $Pass passed, $Fail failed ==="
if ($Fail -gt 0) { exit 1 }
