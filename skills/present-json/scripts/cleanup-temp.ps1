# cleanup-temp.ps1 — Remove super-json temporary redirect HTML files (Windows)
# Usage: cleanup-temp.ps1 [-DryRun] [-Dir <path>]
#
# Defaults to $env:TEMP. Removes files matching super-json-*.html.

param(
    [switch]$DryRun,
    [string]$Dir = $env:TEMP
)

$ErrorActionPreference = "Stop"
$pattern = "super-json-*.html"
$count = 0

$files = Get-ChildItem -Path $Dir -Filter $pattern -File -ErrorAction SilentlyContinue

foreach ($f in $files) {
    $count++
    if ($DryRun) {
        Write-Host "[dry-run] would remove: $($f.FullName)"
    } else {
        Remove-Item $f.FullName -Force -ErrorAction SilentlyContinue
        Write-Host "removed: $($f.FullName)"
    }
}

Write-Host "Total: $count file(s)"
exit 0
