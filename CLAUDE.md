# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Universal Multi-layer Escaped JSON Editor - a standalone web application that parses and edits deeply nested/escaped JSON structures. The application is built as a single HTML file with embedded JavaScript and CSS.

## Product Concept

The application has three distinct sections:
1. **Input Panel** (left) - Accepts raw JSON input, editable
2. **Layer Editor** (middle) - Multiple tabs for each JSON layer with bidirectional sync between tabs
3. **Output Panel** (right) - Displays final JSON result, read-only

### Key Behaviors
- **No automatic syncing between sections** - Input, Layer Editor, and Output are independent
- **Only two action buttons**: "智能分析" (analyze input) and "生成输出" (generate output)
- **Bidirectional tab sync** - Changes in any layer tab automatically update related parent/child tabs
- **Explicit workflow** - User controls flow: Input → Analyze → Edit Layers → Generate → Output

## Architecture

### Core Components

1. **JSONLayerAnalyzer Class** (index.html:659-736)
   - Analyzes and detects multiple layers of escaped JSON
   - Recursively parses strings that contain JSON
   - Rebuilds nested JSON structures after editing
   - Tracks parent-child relationships between layers

2. **Monaco Editor Integration** (index.html:739-778)
   - Three main editors: input, output, and dynamic layer editors
   - VS Code's Monaco Editor for syntax highlighting and JSON validation
   - Auto-formatting and real-time validation

3. **Layer Management System**
   - Dynamic tab generation for each detected JSON layer
   - Independent editing of each layer
   - Automatic synchronization between layers (when enabled)

## Key Functions

- `analyzeJSON()` (index.html:781-810): Main entry point for parsing multi-layer JSON
- `generateEditTabs()` (index.html:813-879): Creates UI tabs for each detected layer
- `generateOutput()` (index.html:1049-1063): Produces final JSON output
- `rebuildFromLayers()` (index.html:972-1022): Reconstructs nested JSON from edited layers

## Development Notes

### No Build System
This is a standalone HTML application with no build process, package management, or external dependencies beyond CDN-loaded Monaco Editor.

### Testing
Manual testing only - open index.html in a browser and use the example data loader to test functionality.

### Browser Compatibility
Requires modern browser with ES6+ support for template literals, arrow functions, and modern DOM APIs.

## Common Tasks

### Adding New Features
Edit the single index.html file directly. All logic, styles, and markup are contained within this file.

### Debugging
Use browser developer tools. Key areas to monitor:
- `parsedLayers` global variable for layer state
- `editors` object for Monaco editor instances
- Network tab for Monaco Editor CDN loading