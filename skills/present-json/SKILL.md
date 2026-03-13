---
name: present-json
description: "Present JSON results to humans via an interactive browser viewer. Use this when you have JSON output (API responses, data analysis, configs, etc.) that would benefit from visual exploration rather than raw text in the terminal. Usage: /present-json [json-content-or-file-path] [tab-name]"
allowed-tools: Bash
---

# Present JSON

Present JSON to humans in Super JSON Editor — an interactive browser-based viewer with syntax highlighting, layer navigation, and JSON Hero integration.

**Built for agents, designed for humans.** Instead of dumping raw JSON in the terminal, give the user a clickable link to explore the data visually.

## When to use

- You produced JSON output the user needs to review (API responses, query results, generated configs)
- The JSON is complex/nested and hard to read as plain text
- You want the user to be able to edit, search, or navigate the JSON interactively

## Instructions

1. Determine the JSON content:
   - If `$0` is a file path, read JSON from that file
   - Otherwise, treat `$ARGUMENTS` as inline JSON or use the JSON from the current context
2. Determine the tab name:
   - Use `$1` if provided
   - Otherwise, derive a meaningful name from the context (e.g., "API Response", "User Config")
   - Default to "Result" if nothing else fits
3. Generate the URL, write a redirect HTML file to `/tmp`, and open it in the browser
4. Present a brief description of the content to the user

## Generating and opening the link

**Detect the platform first**, then use the appropriate commands:

### macOS / Linux (bash/zsh)

```bash
url="https://hrhrng.github.io/super-json?c=$(echo -n '<JSON_CONTENT>' | gzip -9 | base64 | tr '+/' '-_' | tr -d '=\n')&t=<TAB_NAME>"
f="/tmp/super-json-$(head -c 4 /dev/urandom | xxd -p).html"
printf '<html><head><meta http-equiv="refresh" content="0;url=%s"><script>location.href="%s"</script></head></html>' "$url" "$url" > "$f"
open "$f" 2>/dev/null || xdg-open "$f" 2>/dev/null || echo "$url"
```

### Windows (PowerShell)

```powershell
$json = '<JSON_CONTENT>'
$bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
$ms = New-Object System.IO.MemoryStream
$gz = New-Object System.IO.Compression.GZipStream($ms, [System.IO.Compression.CompressionLevel]::Optimal)
$gz.Write($bytes, 0, $bytes.Length); $gz.Close()
$encoded = [Convert]::ToBase64String($ms.ToArray()).Replace('+','-').Replace('/','_').TrimEnd('=')
$url = "https://hrhrng.github.io/super-json?c=$encoded&t=<TAB_NAME>"
$f = "$env:TEMP\super-json-$([guid]::NewGuid().ToString('N').Substring(0,8)).html"
"<html><head><meta http-equiv='refresh' content='0;url=$url'><script>location.href='$url'</script></head></html>" | Out-File -Encoding utf8 $f
Start-Process $f
Start-Sleep -Seconds 3; Remove-Item $f -ErrorAction SilentlyContinue
```

### From a file

**macOS / Linux:**
```bash
url="https://hrhrng.github.io/super-json?c=$(gzip -9 < /path/to/file.json | base64 | tr '+/' '-_' | tr -d '=\n')&t=<TAB_NAME>"
f="/tmp/super-json-$(head -c 4 /dev/urandom | xxd -p).html"
printf '<html><head><meta http-equiv="refresh" content="0;url=%s"><script>location.href="%s"</script></head></html>' "$url" "$url" > "$f"
open "$f" 2>/dev/null || xdg-open "$f" 2>/dev/null || echo "$url"
```

**Windows (PowerShell):**
```powershell
$bytes = [System.IO.File]::ReadAllBytes("C:\path\to\file.json")
$ms = New-Object System.IO.MemoryStream
$gz = New-Object System.IO.Compression.GZipStream($ms, [System.IO.Compression.CompressionLevel]::Optimal)
$gz.Write($bytes, 0, $bytes.Length); $gz.Close()
$encoded = [Convert]::ToBase64String($ms.ToArray()).Replace('+','-').Replace('/','_').TrimEnd('=')
$url = "https://hrhrng.github.io/super-json?c=$encoded&t=<TAB_NAME>"
$f = "$env:TEMP\super-json-$([guid]::NewGuid().ToString('N').Substring(0,8)).html"
"<html><head><meta http-equiv='refresh' content='0;url=$url'><script>location.href='$url'</script></head></html>" | Out-File -Encoding utf8 $f
Start-Process $f
Start-Sleep -Seconds 3; Remove-Item $f -ErrorAction SilentlyContinue
```

### Notes
- Replace `<JSON_CONTENT>` with the actual JSON string
- Replace `<TAB_NAME>` with a URL-encoded tab name (spaces → `%20`)
- **Always prefer `?c=` (compressed)** — it produces significantly shorter URLs (typically 50-70% smaller for JSON)
- The redirect HTML uses both `<meta refresh>` and `location.href` for maximum browser compatibility

### Platform detection
- **macOS**: `open` command, temp dir `/tmp`
- **Linux**: `xdg-open` command, temp dir `/tmp`
- **Windows**: `Start-Process` command, temp dir `$env:TEMP`
- If the shell is PowerShell (or `$PSVersionTable` exists), use the PowerShell variant

## Hero mode (rich interactive viewer)

For complex JSON that benefits from tree navigation, type info, and search, add `&h=1` to the URL:

**macOS / Linux:**
```bash
url="https://hrhrng.github.io/super-json?c=$(echo -n '<JSON_CONTENT>' | gzip -9 | base64 | tr '+/' '-_' | tr -d '=\n')&t=<TAB_NAME>&h=1"
f="/tmp/super-json-$(head -c 4 /dev/urandom | xxd -p).html"
printf '<html><head><meta http-equiv="refresh" content="0;url=%s"><script>location.href="%s"</script></head></html>' "$url" "$url" > "$f"
open "$f" 2>/dev/null || xdg-open "$f" 2>/dev/null || echo "$url"
```

**Windows (PowerShell):** Same as above, append `&h=1` to the `$url`.

This auto-switches to Hero view and loads the JSON Hero interactive explorer.

## Cleanup temporary files

The skill creates temporary `super-json-*.html` redirect files. Use the bundled cleanup scripts to remove them:

**macOS / Linux:**
```bash
bash scripts/cleanup-temp.sh              # remove all temp files from /tmp
bash scripts/cleanup-temp.sh --dry-run    # preview without deleting
bash scripts/cleanup-temp.sh --dir /path  # custom directory
```

**Windows (PowerShell):**
```powershell
./scripts/cleanup-temp.ps1                # remove all temp files from $env:TEMP
./scripts/cleanup-temp.ps1 -DryRun        # preview without deleting
./scripts/cleanup-temp.ps1 -Dir C:\path   # custom directory
```

To verify the cleanup scripts work correctly, run the test harness:

```bash
# Linux/macOS
bash scripts/test-cleanup.sh

# Windows
pwsh scripts/test-cleanup.ps1
```

## Important notes

- **macOS/Linux**: uses `gzip`, `base64`, `tr`, `xxd`, `printf` — standard POSIX tools
- **Windows**: uses .NET `GZipStream` via PowerShell — no extra installs needed
- Compression typically reduces URL length by 50-70% for JSON data
- The redirect HTML file uses a `super-json-` prefix with 8-char hex ID for easy identification and cleanup
- The URL is entirely client-side — no data is sent to any server (except to jsonhero.io when `h=1`)
- For very large JSON (>6KB uncompressed), the URL may still exceed browser limits even with compression

## URL parameters reference

| Parameter | Encoding | Description |
|-----------|----------|-------------|
| `c` | Gzip + Base64url | **Recommended** — compressed, shell-friendly, shortest URLs |
| `s` | LZ-String compressed | Used by the app's built-in Share button |
| `r` | Base64url | Uncompressed fallback, shell-friendly |
| `t` | URL-encoded string | Custom tab name (works with `c`, `s`, and `r`) |
| `h` | `1` to enable | Auto-switch to Hero mode and load JSON Hero viewer |
