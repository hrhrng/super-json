"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.SuperJsonPanel = void 0;
const vscode = __importStar(require("vscode"));
class SuperJsonPanel {
    static createOrShow(extensionUri, initialContent) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;
        if (SuperJsonPanel.currentPanel) {
            SuperJsonPanel.currentPanel.panel.reveal(column);
            if (initialContent) {
                SuperJsonPanel.currentPanel.setContent(initialContent);
            }
            return SuperJsonPanel.currentPanel;
        }
        const panel = vscode.window.createWebviewPanel(SuperJsonPanel.viewType, 'Super JSON Editor', column || vscode.ViewColumn.One, {
            enableScripts: true,
            retainContextWhenHidden: true,
            localResourceRoots: [
                vscode.Uri.joinPath(extensionUri, 'media'),
            ],
        });
        SuperJsonPanel.currentPanel = new SuperJsonPanel(panel, extensionUri, initialContent);
        return SuperJsonPanel.currentPanel;
    }
    constructor(panel, extensionUri, initialContent) {
        this.disposables = [];
        this.panel = panel;
        this.extensionUri = extensionUri;
        this.update(initialContent);
        this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
        this.panel.webview.onDidReceiveMessage((message) => {
            switch (message.command) {
                case 'applyToEditor':
                    this.applyToActiveEditor(message.content);
                    break;
                case 'showInfo':
                    vscode.window.showInformationMessage(message.text);
                    break;
                case 'showError':
                    vscode.window.showErrorMessage(message.text);
                    break;
                case 'copyToClipboard':
                    vscode.env.clipboard.writeText(message.text);
                    vscode.window.showInformationMessage('Copied to clipboard');
                    break;
            }
        }, null, this.disposables);
    }
    setContent(content) {
        this.panel.webview.postMessage({
            command: 'setInput',
            content,
        });
    }
    applyToActiveEditor(content) {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            editor.edit((editBuilder) => {
                const document = editor.document;
                const fullRange = new vscode.Range(document.positionAt(0), document.positionAt(document.getText().length));
                editBuilder.replace(fullRange, content);
            });
            vscode.window.showInformationMessage('Applied output to active editor');
        }
        else {
            vscode.window.showWarningMessage('No active editor to apply to');
        }
    }
    dispose() {
        SuperJsonPanel.currentPanel = undefined;
        this.panel.dispose();
        while (this.disposables.length) {
            const x = this.disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }
    update(initialContent) {
        this.panel.title = 'Super JSON Editor';
        this.panel.webview.html = this.getHtmlForWebview(this.panel.webview, initialContent);
    }
    getHtmlForWebview(webview, initialContent) {
        const nonce = getNonce();
        const escapedContent = initialContent
            ? escapeHtml(initialContent)
            : '';
        return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; font-src https://cdn.jsdelivr.net; connect-src https://cdn.jsdelivr.net;">
  <title>Super JSON Editor</title>
  <style>
    :root {
      --bg-primary: var(--vscode-editor-background);
      --bg-secondary: var(--vscode-sideBar-background);
      --bg-hover: var(--vscode-list-hoverBackground);
      --text-primary: var(--vscode-editor-foreground);
      --text-secondary: var(--vscode-descriptionForeground);
      --border-color: var(--vscode-panel-border);
      --accent: var(--vscode-button-background);
      --accent-hover: var(--vscode-button-hoverBackground);
      --accent-fg: var(--vscode-button-foreground);
      --input-bg: var(--vscode-input-background);
      --input-border: var(--vscode-input-border);
      --tab-active-bg: var(--vscode-tab-activeBackground);
      --tab-inactive-bg: var(--vscode-tab-inactiveBackground);
      --badge-bg: var(--vscode-badge-background);
      --badge-fg: var(--vscode-badge-foreground);
      --error-fg: var(--vscode-errorForeground);
      --success-fg: #4ec9b0;
    }

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--text-primary);
      background: var(--bg-primary);
      height: 100vh;
      overflow: hidden;
    }

    .app {
      display: flex;
      flex-direction: column;
      height: 100vh;
    }

    .toolbar {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      background: var(--bg-secondary);
      border-bottom: 1px solid var(--border-color);
      flex-shrink: 0;
    }

    .toolbar-title {
      font-weight: 600;
      font-size: 13px;
      margin-right: 8px;
      color: var(--text-secondary);
    }

    .btn {
      padding: 4px 12px;
      border: none;
      border-radius: 3px;
      cursor: pointer;
      font-size: 12px;
      font-family: inherit;
      transition: background 0.15s;
    }

    .btn-primary {
      background: var(--accent);
      color: var(--accent-fg);
    }
    .btn-primary:hover { background: var(--accent-hover); }

    .btn-secondary {
      background: transparent;
      color: var(--text-primary);
      border: 1px solid var(--border-color);
    }
    .btn-secondary:hover { background: var(--bg-hover); }

    .toolbar-separator {
      width: 1px;
      height: 20px;
      background: var(--border-color);
    }

    .main-content {
      display: flex;
      flex: 1;
      overflow: hidden;
    }

    .panel {
      display: flex;
      flex-direction: column;
      min-width: 0;
      overflow: hidden;
    }

    .panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 6px 12px;
      background: var(--bg-secondary);
      border-bottom: 1px solid var(--border-color);
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--text-secondary);
      flex-shrink: 0;
    }

    .panel-header-actions {
      display: flex;
      gap: 4px;
    }

    .panel-header .btn {
      padding: 2px 8px;
      font-size: 11px;
    }

    .panel-body {
      flex: 1;
      overflow: hidden;
      position: relative;
    }

    .editor-container {
      width: 100%;
      height: 100%;
    }

    .editor-container textarea {
      width: 100%;
      height: 100%;
      background: var(--bg-primary);
      color: var(--text-primary);
      border: none;
      resize: none;
      padding: 12px;
      font-family: var(--vscode-editor-font-family, 'Consolas, Monaco, monospace');
      font-size: var(--vscode-editor-font-size, 13px);
      line-height: 1.5;
      tab-size: 2;
      outline: none;
    }

    .resize-handle {
      width: 4px;
      cursor: col-resize;
      background: var(--border-color);
      flex-shrink: 0;
      transition: background 0.15s;
    }
    .resize-handle:hover,
    .resize-handle.active {
      background: var(--accent);
    }

    /* Layer tabs */
    .layer-tabs {
      display: flex;
      gap: 0;
      background: var(--bg-secondary);
      border-bottom: 1px solid var(--border-color);
      overflow-x: auto;
      flex-shrink: 0;
    }

    .layer-tab {
      padding: 6px 14px;
      cursor: pointer;
      font-size: 12px;
      border: none;
      background: var(--tab-inactive-bg);
      color: var(--text-secondary);
      border-right: 1px solid var(--border-color);
      white-space: nowrap;
      transition: background 0.15s;
    }
    .layer-tab:hover { background: var(--bg-hover); }
    .layer-tab.active {
      background: var(--tab-active-bg);
      color: var(--text-primary);
      border-bottom: 2px solid var(--accent);
    }

    .layer-badge {
      display: inline-block;
      padding: 1px 5px;
      border-radius: 8px;
      background: var(--badge-bg);
      color: var(--badge-fg);
      font-size: 10px;
      margin-left: 4px;
    }

    /* Breadcrumb */
    .breadcrumb {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 4px 12px;
      font-size: 11px;
      color: var(--text-secondary);
      background: var(--bg-secondary);
      border-bottom: 1px solid var(--border-color);
      flex-shrink: 0;
      overflow-x: auto;
    }
    .breadcrumb-item {
      cursor: pointer;
      padding: 2px 4px;
      border-radius: 3px;
    }
    .breadcrumb-item:hover { background: var(--bg-hover); }
    .breadcrumb-item.active { color: var(--text-primary); font-weight: 600; }
    .breadcrumb-sep { color: var(--text-secondary); opacity: 0.5; }

    /* Notification */
    .notification {
      position: fixed;
      bottom: 16px;
      right: 16px;
      padding: 8px 16px;
      border-radius: 4px;
      font-size: 12px;
      z-index: 100;
      animation: slideIn 0.2s ease;
      pointer-events: none;
    }
    .notification.success { background: #2d5a3d; color: #4ec9b0; }
    .notification.error { background: #5a2d2d; color: #f48771; }
    .notification.info { background: #2d4a5a; color: #75beff; }

    @keyframes slideIn {
      from { transform: translateY(10px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }

    .layer-info {
      padding: 16px;
      color: var(--text-secondary);
      font-size: 12px;
      text-align: center;
    }

    /* Status bar */
    .status-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 2px 12px;
      background: var(--bg-secondary);
      border-top: 1px solid var(--border-color);
      font-size: 11px;
      color: var(--text-secondary);
      flex-shrink: 0;
    }
  </style>
</head>
<body>
  <div class="app">
    <div class="toolbar">
      <span class="toolbar-title">Super JSON</span>
      <button class="btn btn-primary" id="btnParse" title="Ctrl+Enter">Parse</button>
      <button class="btn btn-primary" id="btnApply" title="Ctrl+S">Apply</button>
      <div class="toolbar-separator"></div>
      <button class="btn btn-secondary" id="btnFormat">Format</button>
      <button class="btn btn-secondary" id="btnMinify">Minify</button>
      <button class="btn btn-secondary" id="btnEscape">Escape</button>
      <button class="btn btn-secondary" id="btnUnescape">Unescape</button>
      <div class="toolbar-separator"></div>
      <button class="btn btn-secondary" id="btnCopyOutput">Copy Output</button>
      <button class="btn btn-secondary" id="btnApplyToEditor">Apply to Editor</button>
    </div>

    <div class="main-content">
      <!-- Input Panel -->
      <div class="panel" id="inputPanel" style="flex: 1;">
        <div class="panel-header">
          <span>Input</span>
          <div class="panel-header-actions">
            <button class="btn btn-secondary" id="btnClearInput">Clear</button>
          </div>
        </div>
        <div class="panel-body">
          <div class="editor-container">
            <textarea id="inputEditor" spellcheck="false" placeholder="Paste your JSON here...">${escapedContent}</textarea>
          </div>
        </div>
      </div>

      <div class="resize-handle" data-resize="input-layers"></div>

      <!-- Layers Panel -->
      <div class="panel" id="layersPanel" style="flex: 1;">
        <div class="panel-header">
          <span>Layers</span>
          <span id="layerCount" class="layer-badge" style="display:none;">0</span>
        </div>
        <div id="breadcrumb" class="breadcrumb" style="display:none;"></div>
        <div id="layerTabs" class="layer-tabs" style="display:none;"></div>
        <div class="panel-body">
          <div class="editor-container">
            <textarea id="layerEditor" spellcheck="false" placeholder="Click 'Parse' to analyze JSON layers..." style="display:none;"></textarea>
            <div id="layerPlaceholder" class="layer-info">
              Click <strong>Parse</strong> to analyze the input JSON and detect nested layers.
            </div>
          </div>
        </div>
      </div>

      <div class="resize-handle" data-resize="layers-output"></div>

      <!-- Output Panel -->
      <div class="panel" id="outputPanel" style="flex: 1;">
        <div class="panel-header">
          <span>Output</span>
          <div class="panel-header-actions">
            <button class="btn btn-secondary" id="btnApplyOutputToInput">&#x2190; To Input</button>
          </div>
        </div>
        <div class="panel-body">
          <div class="editor-container">
            <textarea id="outputEditor" spellcheck="false" readonly placeholder="Output will appear here after applying changes..."></textarea>
          </div>
        </div>
      </div>
    </div>

    <div class="status-bar">
      <span id="statusLeft">Ready</span>
      <span id="statusRight"></span>
    </div>
  </div>

  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();

    // ---- JSONLayerAnalyzer (inlined) ----
    class JSONLayerAnalyzer {
      constructor(maxDepth = 10) {
        this.maxDepth = maxDepth;
        this.layers = [];
      }

      analyze(input) {
        this.layers = [];
        try {
          const parsed = JSON.parse(input);
          this.layers.push({
            depth: 0,
            content: parsed,
            type: this._getType(parsed),
            parentField: null,
            hasChildren: false,
            parentIndex: -1,
            childIndices: []
          });
          this._scanForEscapedJSON(parsed, 0, 0);
        } catch {
          this.layers.push({
            depth: 0,
            content: input,
            originalContent: input,
            type: 'string',
            isEscaped: false,
            parentIndex: -1,
            childIndices: []
          });
        }
        return this.layers;
      }

      _scanForEscapedJSON(obj, currentDepth, parentIndex, path = '') {
        if (currentDepth >= this.maxDepth) return;
        if (obj === null || typeof obj !== 'object') return;

        const entries = Array.isArray(obj)
          ? obj.map((v, i) => [path ? path + '[' + i + ']' : '[' + i + ']', v])
          : Object.entries(obj).map(([k, v]) => [path ? path + '.' + k : k, v]);

        for (const [fieldPath, value] of entries) {
          if (typeof value === 'string' && this._isLikelyJSON(value)) {
            this._tryAddLayer(value, currentDepth, parentIndex, fieldPath);
          } else {
            this._scanForEscapedJSON(value, currentDepth, parentIndex, fieldPath);
          }
        }
      }

      _tryAddLayer(value, currentDepth, parentIndex, fieldPath) {
        try {
          let parsed = null;
          try { parsed = JSON.parse(value); } catch {
            const u = this._tryUnescape(value);
            if (u) parsed = JSON.parse(u);
          }
          if (parsed && typeof parsed === 'object' && parsed !== null) {
            this.layers.push({
              depth: currentDepth + 1,
              content: parsed,
              originalContent: value,
              type: this._getType(parsed),
              parentField: fieldPath,
              isEscaped: true,
              hasChildren: false,
              parentIndex,
              childIndices: []
            });
            const ci = this.layers.length - 1;
            this.layers[parentIndex].childIndices.push(ci);
            this.layers[parentIndex].hasChildren = true;
            this._scanForEscapedJSON(parsed, currentDepth + 1, ci, '');
          }
        } catch {}
      }

      _isLikelyJSON(str) {
        const t = str.trim();
        if ((t.startsWith('{') && t.endsWith('}')) || (t.startsWith('[') && t.endsWith(']'))) return true;
        if (t.includes('\\\\"') || t.includes('\\\\\\\\')) {
          const u = this._tryUnescape(t);
          if (u && ((u.startsWith('{') && u.endsWith('}')) || (u.startsWith('[') && u.endsWith(']')))) return true;
        }
        return false;
      }

      _tryUnescape(str) {
        try { return str.replace(/\\\\"/g, '"').replace(/\\\\\\\\/g, '\\\\'); } catch { return null; }
      }

      rebuild(layers) {
        if (layers.length === 0) return '{}';
        const w = layers.map(l => ({
          ...l,
          content: typeof l.content === 'string' ? l.content : JSON.parse(JSON.stringify(l.content))
        }));
        for (let i = w.length - 1; i > 0; i--) {
          const cur = w[i], par = w[cur.parentIndex];
          if (!par) continue;
          const js = JSON.stringify(cur.content);
          if (cur.parentField === '[parsed]') { par.content = cur.content; }
          else { this._setNested(par.content, cur.parentField, js); }
        }
        return JSON.stringify(w[0].content, null, 2);
      }

      _setNested(obj, path, value) {
        const keys = path.match(/[^.\\[\\]]+/g) || [];
        let cur = obj;
        for (let i = 0; i < keys.length - 1; i++) {
          const k = keys[i];
          if (!(k in cur)) cur[k] = /^\\d+$/.test(keys[i+1]) ? [] : {};
          cur = cur[k];
        }
        cur[keys[keys.length - 1]] = value;
      }

      _getType(data) {
        if (data === null) return 'null';
        if (Array.isArray(data)) return 'array';
        return typeof data;
      }
    }

    // ---- State ----
    const analyzer = new JSONLayerAnalyzer();
    let layers = [];
    let activeLayerIndex = 0;

    // ---- DOM refs ----
    const inputEditor = document.getElementById('inputEditor');
    const layerEditor = document.getElementById('layerEditor');
    const outputEditor = document.getElementById('outputEditor');
    const layerTabs = document.getElementById('layerTabs');
    const layerCount = document.getElementById('layerCount');
    const breadcrumb = document.getElementById('breadcrumb');
    const layerPlaceholder = document.getElementById('layerPlaceholder');
    const statusLeft = document.getElementById('statusLeft');
    const statusRight = document.getElementById('statusRight');

    // ---- Functions ----
    function notify(text, type = 'info') {
      const el = document.createElement('div');
      el.className = 'notification ' + type;
      el.textContent = text;
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 2000);
    }

    function parseInput() {
      const input = inputEditor.value.trim();
      if (!input) {
        notify('Please enter JSON to parse', 'error');
        return;
      }

      layers = analyzer.analyze(input);
      activeLayerIndex = 0;
      renderLayers();
      statusLeft.textContent = 'Parsed: ' + layers.length + ' layer(s) detected';
      notify('Found ' + layers.length + ' layer(s)', 'success');
    }

    function renderLayers() {
      if (layers.length === 0) {
        layerTabs.style.display = 'none';
        breadcrumb.style.display = 'none';
        layerCount.style.display = 'none';
        layerEditor.style.display = 'none';
        layerPlaceholder.style.display = 'block';
        return;
      }

      layerPlaceholder.style.display = 'none';
      layerEditor.style.display = 'block';
      layerTabs.style.display = 'flex';
      layerCount.style.display = 'inline-block';
      layerCount.textContent = layers.length;

      // Render tabs
      layerTabs.innerHTML = '';
      layers.forEach((layer, idx) => {
        const tab = document.createElement('button');
        tab.className = 'layer-tab' + (idx === activeLayerIndex ? ' active' : '');
        const label = idx === 0 ? 'Root' : (layer.parentField || 'Layer ' + idx);
        tab.innerHTML = label + ' <span class="layer-badge">L' + layer.depth + '</span>';
        tab.onclick = () => switchLayer(idx);
        layerTabs.appendChild(tab);
      });

      // Render breadcrumb
      renderBreadcrumb();

      // Show active layer content
      const activeLayer = layers[activeLayerIndex];
      const content = typeof activeLayer.content === 'object'
        ? JSON.stringify(activeLayer.content, null, 2)
        : String(activeLayer.content);
      layerEditor.value = content;
    }

    function renderBreadcrumb() {
      breadcrumb.style.display = 'flex';
      breadcrumb.innerHTML = '';

      // Build path from root to active layer
      const path = [];
      let idx = activeLayerIndex;
      while (idx >= 0) {
        path.unshift(idx);
        idx = layers[idx].parentIndex;
      }

      path.forEach((layerIdx, i) => {
        if (i > 0) {
          const sep = document.createElement('span');
          sep.className = 'breadcrumb-sep';
          sep.textContent = '>';
          breadcrumb.appendChild(sep);
        }
        const item = document.createElement('span');
        item.className = 'breadcrumb-item' + (layerIdx === activeLayerIndex ? ' active' : '');
        item.textContent = layerIdx === 0 ? 'Root' : (layers[layerIdx].parentField || 'Layer ' + layerIdx);
        item.onclick = () => switchLayer(layerIdx);
        breadcrumb.appendChild(item);
      });
    }

    function switchLayer(idx) {
      // Save current layer edits
      saveCurrentLayerEdit();
      activeLayerIndex = idx;
      renderLayers();
    }

    function saveCurrentLayerEdit() {
      if (layers.length === 0) return;
      const currentLayer = layers[activeLayerIndex];
      const editorValue = layerEditor.value;
      try {
        currentLayer.content = JSON.parse(editorValue);
      } catch {
        // Keep as string if not valid JSON
        currentLayer.content = editorValue;
      }
    }

    function generateOutput() {
      if (layers.length === 0) {
        notify('No layers to generate output from. Parse first.', 'error');
        return;
      }
      saveCurrentLayerEdit();
      try {
        const output = analyzer.rebuild(layers);
        outputEditor.value = output;
        statusLeft.textContent = 'Output generated';
        notify('Output generated', 'success');
      } catch (err) {
        notify('Error generating output: ' + err.message, 'error');
      }
    }

    function formatInput() {
      try {
        inputEditor.value = JSON.stringify(JSON.parse(inputEditor.value), null, 2);
        notify('Formatted', 'success');
      } catch {
        notify('Invalid JSON - cannot format', 'error');
      }
    }

    function minifyInput() {
      try {
        inputEditor.value = JSON.stringify(JSON.parse(inputEditor.value));
        notify('Minified', 'success');
      } catch {
        notify('Invalid JSON - cannot minify', 'error');
      }
    }

    function escapeInput() {
      inputEditor.value = JSON.stringify(inputEditor.value);
      notify('Escaped', 'success');
    }

    function unescapeInput() {
      try {
        const result = JSON.parse(inputEditor.value);
        if (typeof result === 'string') {
          inputEditor.value = result;
          notify('Unescaped', 'success');
        } else {
          notify('Input is not an escaped string', 'error');
        }
      } catch {
        inputEditor.value = inputEditor.value.replace(/\\\\"/g, '"').replace(/\\\\\\\\/g, '\\\\');
        notify('Unescaped (best effort)', 'info');
      }
    }

    // ---- Event Listeners ----
    document.getElementById('btnParse').onclick = parseInput;
    document.getElementById('btnApply').onclick = generateOutput;
    document.getElementById('btnFormat').onclick = formatInput;
    document.getElementById('btnMinify').onclick = minifyInput;
    document.getElementById('btnEscape').onclick = escapeInput;
    document.getElementById('btnUnescape').onclick = unescapeInput;
    document.getElementById('btnClearInput').onclick = () => {
      inputEditor.value = '';
      layers = [];
      renderLayers();
      outputEditor.value = '';
      statusLeft.textContent = 'Ready';
    };
    document.getElementById('btnCopyOutput').onclick = () => {
      const text = outputEditor.value;
      if (text) {
        vscode.postMessage({ command: 'copyToClipboard', text });
      } else {
        notify('No output to copy', 'error');
      }
    };
    document.getElementById('btnApplyToEditor').onclick = () => {
      const text = outputEditor.value;
      if (text) {
        vscode.postMessage({ command: 'applyToEditor', content: text });
      } else {
        notify('No output to apply', 'error');
      }
    };
    document.getElementById('btnApplyOutputToInput').onclick = () => {
      const text = outputEditor.value;
      if (text) {
        inputEditor.value = text;
        notify('Output applied to input', 'success');
      }
    };

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        parseInput();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        generateOutput();
      }
    });

    // Resize handles
    document.querySelectorAll('.resize-handle').forEach(handle => {
      let startX, startWidths, panels;

      handle.addEventListener('mousedown', (e) => {
        e.preventDefault();
        handle.classList.add('active');
        startX = e.clientX;
        const prev = handle.previousElementSibling;
        const next = handle.nextElementSibling;
        panels = [prev, next];
        startWidths = [prev.offsetWidth, next.offsetWidth];

        const onMouseMove = (e) => {
          const dx = e.clientX - startX;
          const newW1 = Math.max(100, startWidths[0] + dx);
          const newW2 = Math.max(100, startWidths[1] - dx);
          panels[0].style.flex = 'none';
          panels[1].style.flex = 'none';
          panels[0].style.width = newW1 + 'px';
          panels[1].style.width = newW2 + 'px';
        };

        const onMouseUp = () => {
          handle.classList.remove('active');
          document.removeEventListener('mousemove', onMouseMove);
          document.removeEventListener('mouseup', onMouseUp);
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
      });
    });

    // Handle messages from extension
    window.addEventListener('message', (event) => {
      const msg = event.data;
      switch (msg.command) {
        case 'setInput':
          inputEditor.value = msg.content;
          break;
      }
    });

    // Update char count
    function updateStatus() {
      const len = inputEditor.value.length;
      statusRight.textContent = len > 0 ? len.toLocaleString() + ' chars' : '';
    }
    inputEditor.addEventListener('input', updateStatus);
    updateStatus();
  </script>
</body>
</html>`;
    }
}
exports.SuperJsonPanel = SuperJsonPanel;
SuperJsonPanel.viewType = 'superJsonEditor';
function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
function escapeHtml(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
//# sourceMappingURL=webviewProvider.js.map