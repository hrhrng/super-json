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

### Inline JSON (compressed — recommended)

```bash
url="https://hrhrng.github.io/super-json?c=$(echo -n '<JSON_CONTENT>' | gzip -9 | base64 | tr '+/' '-_' | tr -d '=\n')&t=<TAB_NAME>"
f="/tmp/super-json-$(head -c 4 /dev/urandom | xxd -p).html"
printf '<html><head><meta http-equiv="refresh" content="0;url=%s"><script>location.href="%s"</script></head></html>' "$url" "$url" > "$f"
open "$f" 2>/dev/null || xdg-open "$f" 2>/dev/null || echo "$url"
```

### From a file (compressed — recommended)

```bash
url="https://hrhrng.github.io/super-json?c=$(gzip -9 < /path/to/file.json | base64 | tr '+/' '-_' | tr -d '=\n')&t=<TAB_NAME>"
f="/tmp/super-json-$(head -c 4 /dev/urandom | xxd -p).html"
printf '<html><head><meta http-equiv="refresh" content="0;url=%s"><script>location.href="%s"</script></head></html>' "$url" "$url" > "$f"
open "$f" 2>/dev/null || xdg-open "$f" 2>/dev/null || echo "$url"
```

- Replace `<JSON_CONTENT>` with the actual JSON string
- Replace `<TAB_NAME>` with a URL-encoded tab name (spaces → `%20`)
- **Always prefer `?c=` (compressed)** — it produces significantly shorter URLs (typically 50-70% smaller for JSON)
- The redirect HTML uses both `<meta refresh>` and `location.href` for maximum browser compatibility
- Falls back to printing the URL if neither `open` (macOS) nor `xdg-open` (Linux) is available

## Hero mode (rich interactive viewer)

For complex JSON that benefits from tree navigation, type info, and search, add `&h=1`:

```bash
url="https://hrhrng.github.io/super-json?c=$(echo -n '<JSON_CONTENT>' | gzip -9 | base64 | tr '+/' '-_' | tr -d '=\n')&t=<TAB_NAME>&h=1"
f="/tmp/super-json-$(head -c 4 /dev/urandom | xxd -p).html"
printf '<html><head><meta http-equiv="refresh" content="0;url=%s"><script>location.href="%s"</script></head></html>' "$url" "$url" > "$f"
open "$f" 2>/dev/null || xdg-open "$f" 2>/dev/null || echo "$url"
```

This auto-switches to Hero view and loads the JSON Hero interactive explorer.

## Important notes

- Uses only `gzip`, `base64`, `tr`, `xxd`, and `printf` — works on any POSIX shell, no Node.js required
- Compression typically reduces URL length by 50-70% for JSON data
- The redirect HTML file is written to `/tmp` with a `super-json-` prefix and 8-char hex UUID
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
