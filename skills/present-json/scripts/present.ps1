# present.ps1 — Present JSON in Super JSON Editor browser viewer
# Usage: present.ps1 <json-string-or-file> [-Tab NAME] [-Hero]
#
# Compresses JSON with GZipStream+Base64url, opens in browser via temp
# redirect HTML, and automatically cleans up the temp file plus any stale ones.

param(
    [Parameter(Mandatory=$true, Position=0)]
    [string]$Input,

    [string]$Tab = "Result",

    [switch]$Hero
)

$ErrorActionPreference = "Stop"

# Read from file if it exists, otherwise treat as inline JSON
if (Test-Path $Input -PathType Leaf) {
    $bytes = [System.IO.File]::ReadAllBytes($Input)
} else {
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($Input)
}

# Gzip compress
$ms = New-Object System.IO.MemoryStream
$gz = New-Object System.IO.Compression.GZipStream($ms, [System.IO.Compression.CompressionLevel]::Optimal)
$gz.Write($bytes, 0, $bytes.Length)
$gz.Close()

# Base64url encode
$encoded = [Convert]::ToBase64String($ms.ToArray()).Replace('+','-').Replace('/','_').TrimEnd('=')
$ms.Close()

# Build URL
$encodedTab = [Uri]::EscapeDataString($Tab)
$heroParam = if ($Hero) { "&h=1" } else { "" }
$url = "https://hrhrng.github.io/super-json?c=$encoded&t=$encodedTab$heroParam"

# Create temp redirect HTML
$f = Join-Path $env:TEMP "super-json-$([guid]::NewGuid().ToString('N').Substring(0,8)).html"
"<html><head><meta http-equiv='refresh' content='0;url=$url'><script>location.href='$url'</script></head></html>" | Out-File -Encoding utf8 $f

# Open in browser
Start-Process $f -ErrorAction SilentlyContinue

# Cleanup: delete this temp file + any stale super-json-*.html after delay
Start-Job -ScriptBlock {
    param($dir)
    Start-Sleep -Seconds 5
    Get-ChildItem -Path $dir -Filter "super-json-*.html" -File -ErrorAction SilentlyContinue |
        Remove-Item -Force -ErrorAction SilentlyContinue
} -ArgumentList $env:TEMP | Out-Null

Write-Output $url
