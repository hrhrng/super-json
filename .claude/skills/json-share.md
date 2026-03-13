# json-share

Generate a Super JSON Editor share link for JSON content so humans can view and edit it in the browser.

## Usage

When the user asks you to share JSON (or when you want to present JSON to the user in an interactive viewer), use this skill to generate a shareable link.

## How it works

1. Take the JSON content (string) that needs to be shared
2. Run the Node.js script below to compress and generate a share URL
3. Present the link to the user

## Generating the share link

Run the following command, replacing the JSON content and optional tab name:

```bash
node -e "
const LZString = require('lz-string');
const input = process.argv[1];
const tabName = process.argv[2] || '';
const compressed = LZString.compressToEncodedURIComponent(input);
let url = 'https://hrhrng.github.io/super-json?s=' + compressed;
if (tabName) url += '&t=' + encodeURIComponent(tabName);
console.log(url);
" -- '<JSON_CONTENT>' '<TAB_NAME>'
```

- `<JSON_CONTENT>`: The JSON string to share (required)
- `<TAB_NAME>`: Custom tab name displayed in the editor (optional)

## Important notes

- The command must be run from the project root (`/home/user/super-json`) so that `require('lz-string')` resolves from `node_modules`.
- For large JSON, write the content to a temporary file and read it in the script instead of passing it as an argument.
- The generated URL is entirely client-side — no data is sent to any server.
- Share links have practical URL length limits (~2000 chars for broad compatibility, ~8000 chars for modern browsers).

## Example

```bash
cd /home/user/super-json && node -e "
const LZString = require('lz-string');
const input = process.argv[1];
const tabName = process.argv[2] || '';
const compressed = LZString.compressToEncodedURIComponent(input);
let url = 'https://hrhrng.github.io/super-json?s=' + compressed;
if (tabName) url += '&t=' + encodeURIComponent(tabName);
console.log(url);
" -- '{"name":"example","value":42}' 'My Example'
```

This outputs a URL like:
```
https://hrhrng.github.io/super-json?s=N4IgJghgLhIFwEYBsAOAbAhgZyQSwgCcBXVDAWQHsBnAFxgBoQBTYgdwFp6IA7Ky...&t=My%20Example
```

## For large JSON content

```bash
cd /home/user/super-json && node -e "
const LZString = require('lz-string');
const fs = require('fs');
const input = fs.readFileSync(process.argv[1], 'utf8');
const tabName = process.argv[2] || '';
const compressed = LZString.compressToEncodedURIComponent(input);
let url = 'https://hrhrng.github.io/super-json?s=' + compressed;
if (tabName) url += '&t=' + encodeURIComponent(tabName);
console.log(url);
" -- '/path/to/file.json' 'Tab Name'
```
