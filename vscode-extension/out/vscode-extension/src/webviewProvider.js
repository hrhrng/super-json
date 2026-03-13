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
exports.getWebviewHtml = getWebviewHtml;
const vscode = __importStar(require("vscode"));
class SuperJsonPanel {
    static createOrShow(extensionUri, initialContent) {
        const column = vscode.ViewColumn.Beside;
        if (SuperJsonPanel.currentPanel) {
            SuperJsonPanel.currentPanel.panel.reveal(column);
            if (initialContent) {
                SuperJsonPanel.currentPanel.sendParseContent(initialContent);
            }
            return SuperJsonPanel.currentPanel;
        }
        const panel = vscode.window.createWebviewPanel(SuperJsonPanel.viewType, 'Super JSON Layers', column, {
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
        this.panel.webview.html = this.getHtmlForWebview(this.panel.webview);
        if (initialContent) {
            setTimeout(() => this.sendParseContent(initialContent), 300);
        }
        this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
        this.panel.webview.onDidReceiveMessage((message) => {
            switch (message.command) {
                case 'requestParse':
                    this.handleRequestParse();
                    break;
                case 'applyToEditor':
                    this.applyToActiveEditor(message.content);
                    break;
                case 'copyToClipboard':
                    vscode.env.clipboard.writeText(message.text);
                    vscode.window.showInformationMessage('Copied to clipboard');
                    break;
            }
        }, null, this.disposables);
    }
    sendParseContent(content) {
        this.panel.webview.postMessage({
            command: 'parseContent',
            content,
        });
    }
    handleRequestParse() {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showWarningMessage('No active editor - open a JSON file first');
            return;
        }
        const content = editor.document.getText();
        if (!content.trim()) {
            vscode.window.showWarningMessage('Active editor is empty');
            return;
        }
        this.sendParseContent(content);
    }
    applyToActiveEditor(content) {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            editor.edit((editBuilder) => {
                const document = editor.document;
                const fullRange = new vscode.Range(document.positionAt(0), document.positionAt(document.getText().length));
                editBuilder.replace(fullRange, content);
            });
            vscode.window.showInformationMessage('Applied to active editor');
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
    getHtmlForWebview(webview) {
        const nonce = getNonce();
        return getWebviewHtml(nonce, webview.cspSource);
    }
}
exports.SuperJsonPanel = SuperJsonPanel;
SuperJsonPanel.viewType = 'superJsonEditor';
function getWebviewHtml(nonce, cspSource) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <title>Super JSON Layers</title>
  <style>
  :root {
    --primary: #1fb6ff;
    --secondary: #8b5dff;
    --accent: #00ff88;
    --bg-dark: #000000;
    --bg-panel: #0d141a;
    --border: rgba(31, 182, 255, 0.15);
    --text-primary: #ffffff;
    --text-secondary: #1fb6ff;
    --text-dim: #666666;
    --success: #00ff88;
    --error: #ff6b9d;
    --font-mono: 'JetBrains Mono', 'Fira Code', 'SF Mono', 'Consolas', 'Monaco', monospace;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  button { cursor: pointer !important; }
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 3px; }
  * { scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.08) transparent; }
  body { font-family: var(--font-mono); font-weight: 300; font-size: 12px; letter-spacing: 0.5px; background: var(--bg-dark); color: var(--text-primary); overflow: hidden; height: 100vh; }
  .app { display: flex; flex-direction: column; height: 100vh; }
  .header { height: 50px; background: var(--bg-panel); border-bottom: 1px solid var(--border); display: flex; align-items: center; padding: 0 20px; gap: 20px; flex-shrink: 0; }
  .title { font-size: 14px; font-weight: 500; letter-spacing: 1px; text-transform: uppercase; background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%); background-clip: text; -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
  .header-hint { font-size: 11px; color: var(--text-dim); flex: 1; }
  .actions { display: flex; gap: 10px; }
  .btn { background: transparent; border: 1px solid var(--border); color: var(--text-dim); padding: 6px 14px; border-radius: 4px; font-size: 12px; font-weight: 500; font-family: var(--font-mono); transition: all 0.2s; }
  .btn:hover { border-color: var(--text-secondary); color: var(--text-secondary); }
  .btn.primary { background: var(--accent); border: 1px solid var(--accent); color: var(--bg-dark); font-weight: 600; }
  .btn.primary:hover { filter: brightness(1.2); }
  .panel { flex: 1; display: flex; flex-direction: column; overflow: hidden; min-height: 0; }
  .panel-header { height: 35px; background: var(--bg-panel); border-bottom: 1px solid var(--border); display: flex; align-items: center; padding: 0 15px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-secondary); gap: 10px; flex-shrink: 0; }
  .panel-info { color: var(--text-dim); font-weight: normal; }
  .panel-actions { margin-left: auto; display: flex; gap: 8px; }
  .tool-btn { padding: 3px 8px; background: transparent; border: 1px solid var(--border); color: var(--text-dim); border-radius: 3px; font-size: 10px; font-family: var(--font-mono); transition: all 0.2s; text-transform: uppercase; letter-spacing: 0.3px; }
  .tool-btn:hover { border-color: var(--text-secondary); color: var(--text-secondary); background: rgba(31, 182, 255, 0.05); }
  .vscode-breadcrumb { height: 28px; background: rgba(13, 20, 26, 0.95); border-bottom: 1px solid var(--border); display: flex; align-items: center; padding: 0 12px; font-size: 11px; overflow-x: auto; white-space: nowrap; flex-shrink: 0; }
  .vscode-breadcrumb::-webkit-scrollbar { height: 0; }
  .breadcrumb-item { color: var(--text-dim); cursor: pointer; padding: 3px 8px; border-radius: 3px; transition: all 0.15s; display: inline-flex; align-items: center; font-weight: 500; border: 1px solid rgba(31, 182, 255, 0.15); background: transparent; }
  .breadcrumb-item:hover { background: rgba(31, 182, 255, 0.08); color: var(--text-secondary); border-color: rgba(31, 182, 255, 0.25); }
  .breadcrumb-item.active { color: var(--accent); background: rgba(0, 255, 136, 0.05); border-color: rgba(0, 255, 136, 0.25); font-weight: 600; }
  .breadcrumb-separator { color: rgba(31, 182, 255, 0.3); margin: 0 4px; font-size: 10px; opacity: 0.6; }
  .layer-tabs { display: flex; gap: 6px; padding: 6px 12px; background: var(--bg-panel); border-bottom: 1px solid var(--border); overflow-x: auto; flex-shrink: 0; }
  .layer-tab { padding: 3px 8px; background: rgba(31, 182, 255, 0.05); border: 1px solid var(--border); border-radius: 4px; cursor: pointer; color: var(--text-dim); font-size: 10px; font-family: var(--font-mono); transition: all 0.3s; white-space: nowrap; }
  .layer-tab:hover { background: rgba(31, 182, 255, 0.1); color: var(--text-secondary); }
  .layer-tab.active { background: var(--accent); border-color: var(--accent); color: var(--bg-dark); font-weight: 500; }
  .layer-badge { display: inline-block; padding: 0 4px; border-radius: 6px; font-size: 9px; margin-left: 4px; opacity: 0.7; }
  .editor-container { flex: 1; position: relative; min-height: 0; overflow: hidden; }
  .editor-container textarea { width: 100%; height: 100%; background: var(--bg-dark); color: var(--text-primary); border: none; resize: none; padding: 12px; font-family: var(--font-mono); font-size: 13px; line-height: 1.6; tab-size: 2; outline: none; caret-color: #00ffff; }
  .editor-container textarea::placeholder { color: var(--text-dim); }
  .layer-placeholder { display: flex; align-items: center; justify-content: center; height: 100%; color: var(--text-dim); font-size: 13px; text-align: center; padding: 40px; line-height: 1.8; }
  .layer-placeholder strong { color: var(--accent); }
  .notification { position: fixed; top: 15px; right: 15px; background: var(--bg-panel); border: 1px solid var(--border); border-radius: 6px; padding: 10px 16px; font-size: 12px; z-index: 1000; box-shadow: 0 4px 12px rgba(0,0,0,0.3); animation: slideIn 0.3s ease; pointer-events: none; }
  .notification.success { border-color: var(--accent); color: var(--accent); }
  .notification.error { border-color: var(--error); color: var(--error); }
  .notification.info { border-color: var(--primary); color: var(--primary); }
  @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
  .status-bar { height: 28px; background: var(--bg-panel); border-top: 1px solid var(--border); display: flex; align-items: center; padding: 0 20px; font-size: 11px; color: var(--text-dim); gap: 20px; flex-shrink: 0; }
  .status-dot { display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: var(--text-dim); margin-right: 6px; }
  .status-dot.active { background: var(--accent); animation: pulse 2s infinite; }
  @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
  .status-right { margin-left: auto; }
  </style>
</head>
<body>
  <div class="app">
    <div class="header">
      <span class="title">Super JSON</span>
      <span class="header-hint">Active editor = Input</span>
      <div class="actions">
        <button class="btn" id="btnParse">Parse</button>
        <button class="btn primary" id="btnApply">Apply</button>
      </div>
    </div>
    <div class="panel">
      <div class="panel-header">
        LAYERS
        <span class="panel-info" id="layerInfo">0 layers</span>
        <div class="panel-actions" id="layerActions" style="display:none;">
          <button class="tool-btn" id="btnFormatLayer">Format</button>
          <button class="tool-btn" id="btnCopyLayer">Copy</button>
        </div>
      </div>
      <div id="breadcrumb" class="vscode-breadcrumb" style="display:none;"></div>
      <div id="layerTabs" class="layer-tabs" style="display:none;"></div>
      <div class="editor-container">
        <textarea id="layerEditor" spellcheck="false" style="display:none;"></textarea>
        <div id="layerPlaceholder" class="layer-placeholder">
          Click <strong>Parse</strong> to read the active editor<br>and detect nested JSON layers.
        </div>
      </div>
    </div>
    <div class="status-bar">
      <span><span class="status-dot" id="statusDot"></span><span id="statusLeft">Ready</span></span>
      <span class="status-right" id="statusRight"></span>
    </div>
  </div>
  <script nonce="${nonce}">
const vscode = typeof acquireVsCodeApi !== 'undefined' ? acquireVsCodeApi() : { postMessage: function(m) { console.log('vscode:', JSON.stringify(m)); } };

class JSONLayerAnalyzer {
  constructor(maxDepth = 10) { this.maxDepth = maxDepth; this.layers = []; }
  analyze(input) {
    this.layers = [];
    try {
      const parsed = JSON.parse(input);
      this.layers.push({ depth: 0, content: parsed, type: this._getType(parsed), parentField: null, hasChildren: false, parentIndex: -1, childIndices: [] });
      this._scan(parsed, 0, 0);
    } catch { this.layers.push({ depth: 0, content: input, type: 'string', parentIndex: -1, childIndices: [] }); }
    return this.layers;
  }
  _scan(obj, depth, pi, path = '') {
    if (depth >= this.maxDepth || obj === null || typeof obj !== 'object') return;
    const entries = Array.isArray(obj) ? obj.map((v,i) => [path ? path+'['+i+']' : '['+i+']', v]) : Object.entries(obj).map(([k,v]) => [path ? path+'.'+k : k, v]);
    for (const [fp, val] of entries) {
      if (typeof val === 'string' && this._isJSON(val)) {
        try {
          let p = null;
          try { p = JSON.parse(val); } catch { const u = val.replace(/\\\\"/g,'"').replace(/\\\\\\\\\\\\\\\\/g,'\\\\'); p = JSON.parse(u); }
          if (p && typeof p === 'object') {
            this.layers.push({ depth: depth+1, content: p, originalContent: val, type: this._getType(p), parentField: fp, isEscaped: true, hasChildren: false, parentIndex: pi, childIndices: [] });
            const ci = this.layers.length-1; this.layers[pi].childIndices.push(ci); this.layers[pi].hasChildren = true;
            this._scan(p, depth+1, ci, '');
          }
        } catch {}
      } else { this._scan(val, depth, pi, fp); }
    }
  }
  _isJSON(s) { const t = s.trim(); return (t[0]==='{' && t[t.length-1]==='}') || (t[0]==='[' && t[t.length-1]===']'); }
  rebuild(layers) {
    if (!layers.length) return '{}';
    const w = layers.map(l => ({...l, content: typeof l.content === 'string' ? l.content : JSON.parse(JSON.stringify(l.content))}));
    for (let i = w.length-1; i > 0; i--) {
      const c = w[i], p = w[c.parentIndex]; if (!p) continue;
      const js = JSON.stringify(c.content);
      if (c.parentField === '[parsed]') p.content = c.content;
      else { const keys = c.parentField.match(/[^.\\\\[\\\\]]+/g)||[]; let cur = p.content; for (let j=0;j<keys.length-1;j++) { if (!(keys[j] in cur)) cur[keys[j]]={}; cur=cur[keys[j]]; } cur[keys[keys.length-1]]=js; }
    }
    return JSON.stringify(w[0].content, null, 2);
  }
  _getType(d) { if (d===null) return 'null'; if (Array.isArray(d)) return 'array'; return typeof d; }
}

const analyzer = new JSONLayerAnalyzer();
let layers = [];
let activeLayerIndex = 0;
const layerEditor = document.getElementById('layerEditor');
const layerTabs = document.getElementById('layerTabs');
const layerInfo = document.getElementById('layerInfo');
const layerActions = document.getElementById('layerActions');
const breadcrumb = document.getElementById('breadcrumb');
const layerPlaceholder = document.getElementById('layerPlaceholder');
const statusLeft = document.getElementById('statusLeft');
const statusRight = document.getElementById('statusRight');
const statusDot = document.getElementById('statusDot');

function notify(text, type) { type = type || 'info'; const el = document.createElement('div'); el.className = 'notification ' + type; el.textContent = text; document.body.appendChild(el); setTimeout(function() { el.remove(); }, 2500); }

function doParse(input) {
  if (!input || !input.trim()) { notify('Empty content', 'error'); return; }
  layers = analyzer.analyze(input);
  activeLayerIndex = 0;
  renderLayers();
  statusDot.classList.add('active');
  statusLeft.textContent = layers.length + ' layer(s) detected';
  statusRight.textContent = input.length.toLocaleString() + ' chars';
  notify('Found ' + layers.length + ' layer(s)', 'success');
}

function renderLayers() {
  if (!layers.length) {
    layerTabs.style.display = 'none'; breadcrumb.style.display = 'none';
    layerActions.style.display = 'none'; layerEditor.style.display = 'none';
    layerPlaceholder.style.display = 'flex'; layerInfo.textContent = '0 layers'; return;
  }
  layerPlaceholder.style.display = 'none'; layerEditor.style.display = 'block';
  layerTabs.style.display = 'flex'; layerActions.style.display = 'flex';
  layerInfo.textContent = layers.length + ' layers';
  layerTabs.innerHTML = '';
  layers.forEach(function(layer, idx) {
    var tab = document.createElement('button');
    tab.className = 'layer-tab' + (idx === activeLayerIndex ? ' active' : '');
    var label = idx === 0 ? 'Root' : (layer.parentField || 'Layer ' + idx);
    tab.innerHTML = label + '<span class="layer-badge">L' + layer.depth + '</span>';
    tab.onclick = function() { switchLayer(idx); };
    layerTabs.appendChild(tab);
  });
  renderBreadcrumb();
  var al = layers[activeLayerIndex];
  layerEditor.value = typeof al.content === 'object' ? JSON.stringify(al.content, null, 2) : String(al.content);
}

function renderBreadcrumb() {
  breadcrumb.style.display = 'flex'; breadcrumb.innerHTML = '';
  var path = [], idx = activeLayerIndex;
  while (idx >= 0) { path.unshift(idx); idx = layers[idx].parentIndex; }
  path.forEach(function(li, i) {
    if (i > 0) { var sep = document.createElement('span'); sep.className = 'breadcrumb-separator'; sep.textContent = '\\u2192'; breadcrumb.appendChild(sep); }
    var item = document.createElement('span');
    item.className = 'breadcrumb-item' + (li === activeLayerIndex ? ' active' : '');
    item.textContent = li === 0 ? 'Root' : (layers[li].parentField || 'Layer ' + li);
    item.onclick = function() { switchLayer(li); };
    breadcrumb.appendChild(item);
  });
}

function switchLayer(idx) { saveCurrentLayerEdit(); activeLayerIndex = idx; renderLayers(); }

function saveCurrentLayerEdit() {
  if (!layers.length) return;
  try { layers[activeLayerIndex].content = JSON.parse(layerEditor.value); }
  catch (e) { layers[activeLayerIndex].content = layerEditor.value; }
}

function applyToEditor() {
  if (!layers.length) { notify('Parse first', 'error'); return; }
  saveCurrentLayerEdit();
  try {
    var output = analyzer.rebuild(layers);
    vscode.postMessage({ command: 'applyToEditor', content: output });
    statusLeft.textContent = 'Applied to editor';
    notify('Applied to editor', 'success');
  } catch(e) { notify('Error: ' + e.message, 'error'); }
}

document.getElementById('btnParse').onclick = function() { vscode.postMessage({ command: 'requestParse' }); };
document.getElementById('btnApply').onclick = applyToEditor;
document.getElementById('btnFormatLayer').onclick = function() {
  if (!layers.length) return;
  try { layerEditor.value = JSON.stringify(JSON.parse(layerEditor.value), null, 2); notify('Formatted', 'success'); }
  catch (e) { notify('Invalid JSON', 'error'); }
};
document.getElementById('btnCopyLayer').onclick = function() {
  if (layerEditor.value) vscode.postMessage({ command: 'copyToClipboard', text: layerEditor.value });
};

document.addEventListener('keydown', function(e) {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); document.getElementById('btnParse').click(); }
  if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); applyToEditor(); }
});

window.addEventListener('message', function(event) {
  var msg = event.data;
  if (msg.command === 'parseContent') doParse(msg.content);
});
  </script>
</body>
</html>`;
}
function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
//# sourceMappingURL=webviewProvider.js.map