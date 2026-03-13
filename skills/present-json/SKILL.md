---
name: present-json
description: Present JSON results to humans via an interactive browser viewer. Use this when you have JSON output (API responses, data analysis, configs, etc.) that would benefit from visual exploration rather than raw text in the terminal.
argument-hint: [json-content-or-file-path] [tab-name]
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
3. Generate the link using the shell command below
4. Present the link to the user with a brief description of the content

## Generating the link

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

## Hero mode (rich interactive viewer)

For complex JSON that benefits from tree navigation, type info, and search, add `&h=1` to open in JSON Hero's interactive viewer:

```bash
encoded=$(echo -n '<JSON_CONTENT>' | base64 | tr '+/' '-_' | tr -d '=\n') && echo "https://hrhrng.github.io/super-json?r=${encoded}&t=<TAB_NAME>&h=1"
```

This auto-switches to Hero view and loads the JSON Hero interactive explorer.

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
