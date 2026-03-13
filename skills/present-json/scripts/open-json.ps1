# open-json.ps1 — Open JSON in Super JSON Editor browser viewer
# Usage: open-json.ps1 <json-or-file> [-Tab NAME] [-Hero]
#
# Compresses JSON with GZipStream+Base64url, creates a temp redirect HTML,
# opens in browser, then deletes the temp file after 5 seconds.

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
Start-Process $f

# Delete temp file after browser has had time to read it
Start-Job -ScriptBlock {
    param($path)
    Start-Sleep -Seconds 5
    Remove-Item $path -Force -ErrorAction SilentlyContinue
} -ArgumentList $f | Out-Null

Write-Host $url
