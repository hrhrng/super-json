# Universal Multi-layer Escaped JSON Editor

A professional web-based tool for parsing, editing, and rebuilding deeply nested/escaped JSON structures.

## Product Concept

The application consists of three distinct sections that work together through explicit user actions:

### 1. Input Section (Left Panel)
- **Purpose**: Accept raw JSON input containing escaped/nested JSON strings
- **Editable**: Yes
- **Function**: Starting point for JSON analysis

### 2. Layer Editor (Middle Panel)
- **Purpose**: Display and edit each detected JSON layer in separate tabs
- **Editable**: Yes
- **Key Feature**: Bidirectional synchronization between tabs
  - Changes in higher-level tabs automatically update related lower-level tabs
  - Changes in lower-level tabs automatically update parent tabs
- **Structure**: Each tab represents one layer of JSON nesting

### 3. Output Section (Right Panel)
- **Purpose**: Display the final reconstructed JSON
- **Editable**: No (read-only)
- **Function**: Shows the result after user triggers generation

## Workflow

1. **Input**: Paste or type JSON with escaped/nested structures into the input panel
2. **Analyze**: Click "智能分析" (Smart Analysis) button to parse and detect all layers
3. **Edit**: Modify JSON in any layer tab - changes automatically sync between related layers
4. **Generate**: Click "生成输出" (Generate Output) button to produce the final JSON
5. **Result**: View the reconstructed JSON in the output panel

## Key Design Principles

- **No Automatic Cross-Section Updates**: The three main sections (Input, Layers, Output) do not automatically sync with each other
- **Explicit User Actions**: Users control the flow through two main buttons:
  - "智能分析" - Parses input into editable layers
  - "生成输出" - Builds final output from edited layers
- **Bidirectional Layer Sync**: Only the layer tabs within the Layer Editor sync with each other automatically
- **Clean Interface**: Minimal buttons for focused functionality

## Technical Details

- Single HTML file application
- No build process or dependencies
- Uses Monaco Editor (VS Code editor) for JSON editing
- Supports unlimited nesting depth (configurable)
- Real-time JSON validation

## Usage

Simply open `index.html` in a modern web browser. No installation or setup required.

## Browser Requirements

- Modern browser with ES6+ support
- JavaScript enabled
- Internet connection (for loading Monaco Editor from CDN)