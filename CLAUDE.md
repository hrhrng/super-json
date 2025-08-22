# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## deploy guidline
use playwright to test ui by snapshot.

## Project Overview

Super JSON Editor is a sophisticated standalone web application that parses, edits, and reconstructs deeply nested/escaped JSON structures. The application is built as a single HTML file with embedded JavaScript and CSS, utilizing Monaco Editor for a professional IDE-like experience.

## Product Concept

The application features a three-panel layout with multi-document support:
1. **Input Panel** (left) - Accepts raw JSON input, fully editable with syntax highlighting
2. **Layer Editor** (middle) - Dynamic multi-tab interface for editing each JSON layer with bidirectional synchronization
3. **Output Panel** (right) - Displays final reconstructed JSON result, read-only

### Core Behaviors
- **Multi-document support** - Work with multiple JSON documents simultaneously via main tabs
- **No automatic syncing between sections** - Input, Layer Editor, and Output are independent by design
- **Two primary action buttons**: "Parse" and "Apply"
- **Bidirectional tab sync** - Changes in any layer tab automatically update related parent/child tabs
- **Explicit workflow** - User-controlled flow: Input → Analyze → Edit Layers → Generate → Output
- **Auto-save functionality** - All documents and states are automatically saved to localStorage

## Architecture

### Core Components

1. **JSONLayerAnalyzer Class** (lines 672-755)
   - Recursively analyzes and detects multiple layers of escaped JSON
   - Parses strings that contain JSON objects/arrays
   - Rebuilds nested JSON structures after editing
   - Tracks parent-child relationships between layers
   - Supports configurable max depth (default: 10 layers)

2. **Document Management System** (lines 757-886)
   - Multi-document support with unique IDs
   - Automatic state preservation across sessions
   - Tab-based document switching with optimized performance
   - In-place title editing via double-click
   - Document close functionality with automatic fallback

3. **Monaco Editor Integration** (lines 1087-1155)
   - Three primary editors: input, output, and dynamic layer editors
   - VS Code's Monaco Editor for professional editing experience
   - Auto-formatting, real-time validation, and syntax highlighting
   - Configurable font size and line numbers
   - Word wrap and paste formatting

4. **Layer Management System** (lines 1199-1252)
   - Dynamic tab generation for each detected JSON layer
   - Lazy loading of layer editors for performance
   - Independent editing of each layer
   - Automatic bidirectional synchronization between layers
   - Parent-child relationship tracking

5. **Performance Optimizations**
   - Debounced save operations (300ms delay)
   - Lazy editor creation (only when tab is viewed)
   - DOM element caching for tabs
   - Batch DOM updates
   - RequestAnimationFrame for non-blocking UI updates

## Key Functions

### Core Operations
- `analyzeJSON()` (lines 1158-1196): Main entry point for parsing multi-layer JSON
- `generateOutput()` (lines 1582-1616): Produces final JSON output from edited layers
- `rebuildFromLayers()` (lines 1505-1555): Reconstructs nested JSON from edited layers

### Document Management
- `createDocument()` (lines 758-770): Creates new document with unique ID
- `switchToDocument()` (lines 778-830): Optimized document switching
- `closeDocument()` (lines 847-885): Closes document with proper cleanup
- `renderMainTabs()` (lines 891-920): Efficient tab rendering with caching

### Layer Editing
- `generateEditTabs()` (lines 1199-1252): Creates UI tabs for each detected layer
- `createLayerEditor()` (lines 1254-1291): Lazy creation of Monaco editors
- `handleLayerEdit()` (lines 1319-1352): Processes layer edits with sync
- `updateChildLayers()` (lines 1355-1401): Propagates changes to child layers
- `updateParentLayers()` (lines 1404-1448): Propagates changes to parent layers

### Utilities
- `debounce()` (lines 659-669): Performance utility for throttling operations
- `saveDocumentsToStorage()` (lines 1028-1054): Auto-save with visual feedback
- `loadDocumentsFromStorage()` (lines 1056-1084): Restore session state
- `showNotification()` (lines 1683-1692): User feedback system

## Features

### Current Features
1. **Multi-layer JSON parsing** - Handles infinite nested escaped JSON strings
2. **Multi-document tabs** - Work with multiple JSON documents simultaneously
3. **Bidirectional sync** - Real-time synchronization between parent and child layers
4. **Auto-save** - Automatic persistence to localStorage with visual feedback
5. **Keyboard shortcuts** - Productivity shortcuts for common operations
6. **Resizable panels** - Adjustable panel widths for optimal workspace
7. **Real-time validation** - Instant JSON syntax validation
8. **Lazy loading** - Editors created only when needed for performance
9. **Smart analysis** - Intelligent detection of JSON structures within strings
10. **Apply output to input** - Quick workflow for iterative processing

### Keyboard Shortcuts
- `Ctrl+Enter` - Analyze JSON
- `Ctrl+S` - Generate Output
- `Ctrl+T` - New Document
- `Ctrl+W` - Close Current Document
- `Ctrl+Tab` - Switch to Next Document

## Development Notes

### Architecture Principles
1. **Single File Design** - All functionality in one HTML file for simplicity
2. **No Build System** - Direct browser execution without compilation
3. **Progressive Enhancement** - Features load as needed
4. **Performance First** - Optimized for large JSON structures

### Performance Considerations
- Debounced save operations prevent excessive localStorage writes
- Lazy editor creation reduces initial load time
- DOM caching minimizes reflow/repaint operations
- Batch updates for better rendering performance
- RequestAnimationFrame for non-blocking updates

### Browser Requirements
- Modern browser with ES6+ support
- Support for Monaco Editor (Chrome, Firefox, Safari, Edge)
- LocalStorage API availability
- Template literals and arrow functions

## Common Tasks

### Adding New Features
Edit the single index.html file directly. Follow existing patterns for:
- Event handling with proper cleanup
- Debouncing for performance-sensitive operations
- Proper editor disposal to prevent memory leaks
- LocalStorage integration for persistence

### Debugging
Use browser developer tools to monitor:
- `parsedLayers` - Current layer state array
- `editors` - Active Monaco editor instances
- `documents` - All open documents
- `currentDocId` - Active document identifier
- Performance tab for render performance
- Network tab for Monaco Editor CDN loading

### Testing Workflow
1. Open index.html in browser
2. Use sample nested JSON data
3. Test layer detection and editing
4. Verify bidirectional sync
5. Test document management
6. Check auto-save functionality

## Data Flow

```
Input Editor → Smart Analysis → Layer Detection → Layer Editors
     ↓              ↓                ↓                ↓
  Auto-save    Layer Mapping   Parent-Child    Bidirectional
     ↓              ↓           Relationships      Sync
 localStorage  Parsed Layers        ↓                ↓
     ↓              ↓          Rebuild Logic    Real-time
  Restoration   Tab Creation        ↓            Updates
                     ↓          Output Gen          ↓
                Editor Creation      ↓          Parent/Child
                     ↓          Final JSON        Updates
                Lazy Loading
```

## Important Implementation Details

### Layer Relationship Tracking
- Each layer maintains a `parentField` property indicating its origin
- `[parsed]` indicates the entire parent is an escaped JSON string
- Named fields indicate specific object properties containing escaped JSON

### Synchronization Logic
- Changes propagate bidirectionally through parent-child relationships
- Updates use an `isUpdating` flag to prevent circular updates
- Editor positions and selections are preserved during updates

### Memory Management
- Editors are properly disposed when switching documents or closing tabs
- Event listeners are cleaned up to prevent memory leaks
- DOM elements are reused where possible

## Known Limitations
1. Maximum depth of 10 layers (configurable)
2. Large JSON files may impact performance
3. Browser localStorage size limits apply
4. No server-side persistence