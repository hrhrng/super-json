---
name: json-share
description: Generate a Super JSON Editor share link so humans can view JSON in the browser. Use when you need to share JSON content with users interactively.
argument-hint: [json-content-or-file-path] [tab-name]
allowed-tools: Bash
---

# JSON Share

Generate a shareable Super JSON Editor link from JSON content.

## Instructions

1. Determine the JSON content to share:
   - If `$0` is a file path, read JSON from that file
   - Otherwise, treat `$ARGUMENTS` as inline JSON or use the JSON from the current context
2. Determine the tab name:
   - Use `$1` if provided
   - Otherwise, try to extract a meaningful name from the JSON (e.g., a `title` or `name` field)
   - Default to "Shared JSON" if nothing else fits
3. Generate the share link using the shell command below
4. Present the link to the user

## Generating the share link

### Inline JSON

```bash
encoded=$(echo -n '<JSON_CONTENT>' | base64 | tr '+/' '-_' | tr -d '=\n') && echo "https://hrhrng.github.io/super-json?r=${encoded}&t=<TAB_NAME>"
```

### From a file

```bash
encoded=$(base64 < /path/to/file.json | tr '+/' '-_' | tr -d '=\n') && echo "https://hrhrng.github.io/super-json?r=${encoded}&t=<TAB_NAME>"
```

- Replace `<JSON_CONTENT>` with the actual JSON string
- Replace `<TAB_NAME>` with a URL-encoded tab name (spaces → `%20`)

## Hero mode link (interactive JSON viewer)

To share a link that opens directly in JSON Hero's interactive viewer, add `&h=1`:

```bash
encoded=$(echo -n '<JSON_CONTENT>' | base64 | tr '+/' '-_' | tr -d '=\n') && echo "https://hrhrng.github.io/super-json?r=${encoded}&t=<TAB_NAME>&h=1"
```

This will:
1. Import the JSON into a new tab
2. Auto-switch to Hero view mode
3. Automatically call the JSON Hero API to load the interactive viewer

Use hero mode when you want to give the user a rich, interactive JSON exploration experience (tree view, search, type info, etc.).

## Important notes

- Uses only `base64` and `tr` — works on any POSIX shell, no Node.js required
- The URL is entirely client-side — no data is sent to any server (except to jsonhero.io when `h=1`)
- For very large JSON (>6KB), the URL may exceed browser limits

## URL parameters reference

| Parameter | Encoding | Description |
|-----------|----------|-------------|
| `s` | LZ-String compressed | Used by the app's built-in Share button (smaller URLs) |
| `r` | Base64url | Shell-friendly, no dependencies needed |
| `t` | URL-encoded string | Custom tab name (works with both `s` and `r`) |
| `h` | `1` to enable | Auto-switch to Hero mode and load JSON Hero viewer |
