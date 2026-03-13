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
   - If `$0` is a file path, pass it directly to the script
   - Otherwise, treat `$ARGUMENTS` as inline JSON or use the JSON from the current context
2. Determine the tab name:
   - Use `$1` if provided
   - Otherwise, derive a meaningful name from the context (e.g., "API Response", "User Config")
   - Default to "Result" if nothing else fits
3. Run the appropriate script (see below)
4. Present a brief description of the content to the user

## Running the script

**Detect the platform first**, then run:

### macOS / Linux

```bash
# Inline JSON
bash scripts/open-json.sh '{"key": "value"}' --tab "My Data"

# From a file
bash scripts/open-json.sh /path/to/data.json --tab "My Data"

# With Hero mode (rich interactive viewer with tree navigation)
bash scripts/open-json.sh '{"key": "value"}' --tab "My Data" --hero
```

### Windows (PowerShell)

```powershell
# Inline JSON
./scripts/open-json.ps1 '{"key": "value"}' -Tab "My Data"

# From a file
./scripts/open-json.ps1 C:\path\to\data.json -Tab "My Data"

# With Hero mode
./scripts/open-json.ps1 '{"key": "value"}' -Tab "My Data" -Hero
```

### Platform detection
- **macOS/Linux**: use `open-json.sh`
- **Windows** (PowerShell / `$PSVersionTable` exists): use `open-json.ps1`

## Batch cleanup

If temp files accumulate (e.g. the background cleanup was interrupted), use:

```bash
# Linux/macOS
bash scripts/cleanup-temp.sh              # remove all from /tmp
bash scripts/cleanup-temp.sh --dry-run    # preview only
```

```powershell
# Windows
./scripts/cleanup-temp.ps1               # remove all from $env:TEMP
./scripts/cleanup-temp.ps1 -DryRun       # preview only
```

## Important notes

- The script handles compression (gzip + base64url), temp file creation, browser opening, and cleanup automatically
- Temp files are deleted ~5 seconds after opening the browser
- The URL is entirely client-side — no data is sent to any server (except to jsonhero.io when `--hero`/`-Hero`)
- For very large JSON (>6KB uncompressed), the URL may still exceed browser limits even with compression

## URL parameters reference

| Parameter | Encoding | Description |
|-----------|----------|-------------|
| `c` | Gzip + Base64url | **Recommended** — compressed, shell-friendly, shortest URLs |
| `s` | LZ-String compressed | Used by the app's built-in Share button |
| `r` | Base64url | Uncompressed fallback, shell-friendly |
| `t` | URL-encoded string | Custom tab name (works with `c`, `s`, and `r`) |
| `h` | `1` to enable | Auto-switch to Hero mode and load JSON Hero viewer |
