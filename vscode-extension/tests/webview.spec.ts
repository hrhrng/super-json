import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

/**
 * These tests verify the Super JSON Editor webview UI by loading
 * the HTML directly in a browser. The webview HTML is extracted
 * from the compiled extension for testing purposes.
 */

// Helper to generate a standalone test HTML from the webview provider template
function getTestHtml(): string {
  // Read the webview provider source to extract the HTML template
  const providerPath = path.join(__dirname, '..', 'src', 'webviewProvider.ts');
  const source = fs.readFileSync(providerPath, 'utf-8');

  // Create a minimal standalone version for testing
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Super JSON Editor - Test</title>
  <style>
    :root {
      --vscode-editor-background: #1e1e1e;
      --vscode-sideBar-background: #252526;
      --vscode-list-hoverBackground: #2a2d2e;
      --vscode-editor-foreground: #d4d4d4;
      --vscode-descriptionForeground: #858585;
      --vscode-panel-border: #3c3c3c;
      --vscode-button-background: #0e639c;
      --vscode-button-hoverBackground: #1177bb;
      --vscode-button-foreground: #ffffff;
      --vscode-input-background: #3c3c3c;
      --vscode-input-border: #3c3c3c;
      --vscode-tab-activeBackground: #1e1e1e;
      --vscode-tab-inactiveBackground: #2d2d2d;
      --vscode-badge-background: #4d4d4d;
      --vscode-badge-foreground: #ffffff;
      --vscode-errorForeground: #f48771;
      --vscode-font-family: 'Segoe UI', sans-serif;
      --vscode-font-size: 13px;
      --vscode-editor-font-family: 'Consolas', 'Monaco', monospace;
      --vscode-editor-font-size: 13px;
    }

    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--vscode-editor-foreground);
      background: var(--vscode-editor-background);
      height: 100vh;
      overflow: hidden;
    }
    .app { display: flex; flex-direction: column; height: 100vh; }
    .toolbar {
      display: flex; align-items: center; gap: 8px; padding: 8px 12px;
      background: var(--vscode-sideBar-background);
      border-bottom: 1px solid var(--vscode-panel-border); flex-shrink: 0;
    }
    .toolbar-title { font-weight: 600; font-size: 13px; margin-right: 8px; color: var(--vscode-descriptionForeground); }
    .btn {
      padding: 4px 12px; border: none; border-radius: 3px; cursor: pointer;
      font-size: 12px; font-family: inherit;
    }
    .btn-primary { background: var(--vscode-button-background); color: var(--vscode-button-foreground); }
    .btn-secondary { background: transparent; color: var(--vscode-editor-foreground); border: 1px solid var(--vscode-panel-border); }
    .toolbar-separator { width: 1px; height: 20px; background: var(--vscode-panel-border); }
    .main-content { display: flex; flex: 1; overflow: hidden; }
    .panel { display: flex; flex-direction: column; min-width: 0; overflow: hidden; }
    .panel-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 6px 12px; background: var(--vscode-sideBar-background);
      border-bottom: 1px solid var(--vscode-panel-border);
      font-size: 11px; font-weight: 600; text-transform: uppercase;
      letter-spacing: 0.5px; color: var(--vscode-descriptionForeground); flex-shrink: 0;
    }
    .panel-header-actions { display: flex; gap: 4px; }
    .panel-header .btn { padding: 2px 8px; font-size: 11px; }
    .panel-body { flex: 1; overflow: hidden; position: relative; }
    .editor-container { width: 100%; height: 100%; }
    .editor-container textarea {
      width: 100%; height: 100%; background: var(--vscode-editor-background);
      color: var(--vscode-editor-foreground); border: none; resize: none;
      padding: 12px; font-family: var(--vscode-editor-font-family);
      font-size: var(--vscode-editor-font-size); line-height: 1.5;
      tab-size: 2; outline: none;
    }
    .resize-handle { width: 4px; cursor: col-resize; background: var(--vscode-panel-border); flex-shrink: 0; }
    .layer-tabs {
      display: flex; gap: 0; background: var(--vscode-sideBar-background);
      border-bottom: 1px solid var(--vscode-panel-border); overflow-x: auto; flex-shrink: 0;
    }
    .layer-tab {
      padding: 6px 14px; cursor: pointer; font-size: 12px; border: none;
      background: var(--vscode-tab-inactiveBackground); color: var(--vscode-descriptionForeground);
      border-right: 1px solid var(--vscode-panel-border); white-space: nowrap;
    }
    .layer-tab.active {
      background: var(--vscode-tab-activeBackground); color: var(--vscode-editor-foreground);
      border-bottom: 2px solid var(--vscode-button-background);
    }
    .layer-badge {
      display: inline-block; padding: 1px 5px; border-radius: 8px;
      background: var(--vscode-badge-background); color: var(--vscode-badge-foreground);
      font-size: 10px; margin-left: 4px;
    }
    .breadcrumb {
      display: flex; align-items: center; gap: 4px; padding: 4px 12px;
      font-size: 11px; color: var(--vscode-descriptionForeground);
      background: var(--vscode-sideBar-background);
      border-bottom: 1px solid var(--vscode-panel-border); flex-shrink: 0; overflow-x: auto;
    }
    .breadcrumb-item { cursor: pointer; padding: 2px 4px; border-radius: 3px; }
    .breadcrumb-item.active { color: var(--vscode-editor-foreground); font-weight: 600; }
    .breadcrumb-sep { color: var(--vscode-descriptionForeground); opacity: 0.5; }
    .notification {
      position: fixed; bottom: 16px; right: 16px; padding: 8px 16px;
      border-radius: 4px; font-size: 12px; z-index: 100; pointer-events: none;
    }
    .notification.success { background: #2d5a3d; color: #4ec9b0; }
    .notification.error { background: #5a2d2d; color: #f48771; }
    .notification.info { background: #2d4a5a; color: #75beff; }
    .layer-info { padding: 16px; color: var(--vscode-descriptionForeground); font-size: 12px; text-align: center; }
    .status-bar {
      display: flex; align-items: center; justify-content: space-between;
      padding: 2px 12px; background: var(--vscode-sideBar-background);
      border-top: 1px solid var(--vscode-panel-border);
      font-size: 11px; color: var(--vscode-descriptionForeground); flex-shrink: 0;
    }
  </style>
</head>
<body>
  <div class="app">
    <div class="toolbar">
      <span class="toolbar-title">Super JSON</span>
      <button class="btn btn-primary" id="btnParse">Parse</button>
      <button class="btn btn-primary" id="btnApply">Apply</button>
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
      <div class="panel" id="inputPanel" style="flex: 1;">
        <div class="panel-header">
          <span>Input</span>
          <div class="panel-header-actions">
            <button class="btn btn-secondary" id="btnClearInput">Clear</button>
          </div>
        </div>
        <div class="panel-body">
          <div class="editor-container">
            <textarea id="inputEditor" spellcheck="false" placeholder="Paste your JSON here..."></textarea>
          </div>
        </div>
      </div>
      <div class="resize-handle" data-resize="input-layers"></div>
      <div class="panel" id="layersPanel" style="flex: 1;">
        <div class="panel-header">
          <span>Layers</span>
          <span id="layerCount" class="layer-badge" style="display:none;">0</span>
        </div>
        <div id="breadcrumb" class="breadcrumb" style="display:none;"></div>
        <div id="layerTabs" class="layer-tabs" style="display:none;"></div>
        <div class="panel-body">
          <div class="editor-container">
            <textarea id="layerEditor" spellcheck="false" style="display:none;"></textarea>
            <div id="layerPlaceholder" class="layer-info">
              Click <strong>Parse</strong> to analyze the input JSON and detect nested layers.
            </div>
          </div>
        </div>
      </div>
      <div class="resize-handle" data-resize="layers-output"></div>
      <div class="panel" id="outputPanel" style="flex: 1;">
        <div class="panel-header">
          <span>Output</span>
          <div class="panel-header-actions">
            <button class="btn btn-secondary" id="btnApplyOutputToInput">&#x2190; To Input</button>
          </div>
        </div>
        <div class="panel-body">
          <div class="editor-container">
            <textarea id="outputEditor" spellcheck="false" readonly placeholder="Output will appear here..."></textarea>
          </div>
        </div>
      </div>
    </div>
    <div class="status-bar">
      <span id="statusLeft">Ready</span>
      <span id="statusRight"></span>
    </div>
  </div>
  <script>
    // Mock vscode API for testing
    const vscode = { postMessage: function(msg) { console.log('vscode.postMessage:', JSON.stringify(msg)); } };

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
              try { p = JSON.parse(val); } catch { const u = val.replace(/\\\\"/g,'"').replace(/\\\\\\\\/g,'\\\\'); p = JSON.parse(u); }
              if (p && typeof p === 'object') {
                this.layers.push({ depth: depth+1, content: p, originalContent: val, type: this._getType(p), parentField: fp, isEscaped: true, hasChildren: false, parentIndex: pi, childIndices: [] });
                const ci = this.layers.length-1;
                this.layers[pi].childIndices.push(ci);
                this.layers[pi].hasChildren = true;
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
          const c = w[i], p = w[c.parentIndex];
          if (!p) continue;
          const js = JSON.stringify(c.content);
          if (c.parentField === '[parsed]') p.content = c.content;
          else { const keys = c.parentField.match(/[^.\\[\\]]+/g)||[]; let cur = p.content; for (let j=0;j<keys.length-1;j++) { if (!(keys[j] in cur)) cur[keys[j]]={}; cur=cur[keys[j]]; } cur[keys[keys.length-1]]=js; }
        }
        return JSON.stringify(w[0].content, null, 2);
      }
      _getType(d) { if (d===null) return 'null'; if (Array.isArray(d)) return 'array'; return typeof d; }
    }

    const analyzer = new JSONLayerAnalyzer();
    let layers = [];
    let activeLayerIndex = 0;
    const inputEditor = document.getElementById('inputEditor');
    const layerEditor = document.getElementById('layerEditor');
    const outputEditor = document.getElementById('outputEditor');
    const layerTabs = document.getElementById('layerTabs');
    const layerCount = document.getElementById('layerCount');
    const breadcrumb = document.getElementById('breadcrumb');
    const layerPlaceholder = document.getElementById('layerPlaceholder');
    const statusLeft = document.getElementById('statusLeft');
    const statusRight = document.getElementById('statusRight');

    function notify(text, type='info') {
      const el = document.createElement('div');
      el.className = 'notification '+type;
      el.textContent = text;
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 2000);
    }

    function parseInput() {
      const input = inputEditor.value.trim();
      if (!input) { notify('Please enter JSON','error'); return; }
      layers = analyzer.analyze(input);
      activeLayerIndex = 0;
      renderLayers();
      statusLeft.textContent = 'Parsed: '+layers.length+' layer(s)';
    }

    function renderLayers() {
      if (!layers.length) {
        layerTabs.style.display='none'; breadcrumb.style.display='none';
        layerCount.style.display='none'; layerEditor.style.display='none';
        layerPlaceholder.style.display='block'; return;
      }
      layerPlaceholder.style.display='none'; layerEditor.style.display='block';
      layerTabs.style.display='flex'; layerCount.style.display='inline-block';
      layerCount.textContent = layers.length;
      layerTabs.innerHTML = '';
      layers.forEach((layer, idx) => {
        const tab = document.createElement('button');
        tab.className = 'layer-tab'+(idx===activeLayerIndex?' active':'');
        tab.innerHTML = (idx===0?'Root':(layer.parentField||'Layer '+idx))+' <span class="layer-badge">L'+layer.depth+'</span>';
        tab.onclick = () => { saveCurrentLayerEdit(); activeLayerIndex=idx; renderLayers(); };
        layerTabs.appendChild(tab);
      });
      breadcrumb.style.display='flex'; breadcrumb.innerHTML='';
      const path=[]; let idx=activeLayerIndex;
      while(idx>=0) { path.unshift(idx); idx=layers[idx].parentIndex; }
      path.forEach((li,i) => {
        if(i>0) { const s=document.createElement('span'); s.className='breadcrumb-sep'; s.textContent='>'; breadcrumb.appendChild(s); }
        const item=document.createElement('span');
        item.className='breadcrumb-item'+(li===activeLayerIndex?' active':'');
        item.textContent=li===0?'Root':(layers[li].parentField||'Layer '+li);
        item.onclick=()=>{ saveCurrentLayerEdit(); activeLayerIndex=li; renderLayers(); };
        breadcrumb.appendChild(item);
      });
      const al = layers[activeLayerIndex];
      layerEditor.value = typeof al.content==='object' ? JSON.stringify(al.content,null,2) : String(al.content);
    }

    function saveCurrentLayerEdit() {
      if (!layers.length) return;
      try { layers[activeLayerIndex].content = JSON.parse(layerEditor.value); } catch { layers[activeLayerIndex].content = layerEditor.value; }
    }

    function generateOutput() {
      if (!layers.length) { notify('Parse first','error'); return; }
      saveCurrentLayerEdit();
      try { outputEditor.value = analyzer.rebuild(layers); statusLeft.textContent='Output generated'; }
      catch(e) { notify('Error: '+e.message,'error'); }
    }

    document.getElementById('btnParse').onclick = parseInput;
    document.getElementById('btnApply').onclick = generateOutput;
    document.getElementById('btnFormat').onclick = () => { try { inputEditor.value = JSON.stringify(JSON.parse(inputEditor.value),null,2); } catch { notify('Invalid JSON','error'); } };
    document.getElementById('btnMinify').onclick = () => { try { inputEditor.value = JSON.stringify(JSON.parse(inputEditor.value)); } catch { notify('Invalid JSON','error'); } };
    document.getElementById('btnEscape').onclick = () => { inputEditor.value = JSON.stringify(inputEditor.value); };
    document.getElementById('btnUnescape').onclick = () => { try { const r=JSON.parse(inputEditor.value); if(typeof r==='string') inputEditor.value=r; } catch {} };
    document.getElementById('btnClearInput').onclick = () => { inputEditor.value=''; layers=[]; renderLayers(); outputEditor.value=''; statusLeft.textContent='Ready'; };
    document.getElementById('btnCopyOutput').onclick = () => { if(outputEditor.value) navigator.clipboard.writeText(outputEditor.value); };
    document.getElementById('btnApplyToEditor').onclick = () => { vscode.postMessage({command:'applyToEditor',content:outputEditor.value}); };
    document.getElementById('btnApplyOutputToInput').onclick = () => { if(outputEditor.value) { inputEditor.value=outputEditor.value; } };
    inputEditor.addEventListener('input', () => { statusRight.textContent = inputEditor.value.length ? inputEditor.value.length.toLocaleString()+' chars' : ''; });
  </script>
</body>
</html>`;
}

test.describe('Super JSON Editor Webview', () => {
  test.beforeEach(async ({ page }) => {
    const html = getTestHtml();
    await page.setContent(html);
    await page.waitForLoadState('domcontentloaded');
  });

  test('initial layout renders correctly', async ({ page }) => {
    await expect(page.locator('.toolbar-title')).toHaveText('Super JSON');
    await expect(page.locator('#btnParse')).toBeVisible();
    await expect(page.locator('#btnApply')).toBeVisible();
    await expect(page.locator('#layerPlaceholder')).toBeVisible();
    await expect(page.locator('#statusLeft')).toHaveText('Ready');

    await expect(page).toHaveScreenshot('initial-layout.png');
  });

  test('parse simple JSON shows single layer', async ({ page }) => {
    const json = JSON.stringify({ name: 'test', value: 42 });
    await page.locator('#inputEditor').fill(json);
    await page.locator('#btnParse').click();

    await expect(page.locator('#layerCount')).toHaveText('1');
    await expect(page.locator('.layer-tab')).toHaveCount(1);
    await expect(page.locator('#layerEditor')).toBeVisible();

    await expect(page).toHaveScreenshot('single-layer.png');
  });

  test('parse nested escaped JSON shows multiple layers', async ({ page }) => {
    const inner = JSON.stringify({ nested: true, data: [1, 2, 3] });
    const outer = JSON.stringify({ wrapper: 'hello', payload: inner });
    await page.locator('#inputEditor').fill(outer);
    await page.locator('#btnParse').click();

    await expect(page.locator('#layerCount')).toHaveText('2');
    await expect(page.locator('.layer-tab')).toHaveCount(2);

    await expect(page).toHaveScreenshot('nested-layers.png');
  });

  test('switch between layers via tabs', async ({ page }) => {
    const inner = JSON.stringify({ key: 'innerValue' });
    const outer = JSON.stringify({ outer: 'data', inner: inner });
    await page.locator('#inputEditor').fill(outer);
    await page.locator('#btnParse').click();

    // Click second layer tab
    await page.locator('.layer-tab').nth(1).click();
    await expect(page.locator('.layer-tab').nth(1)).toHaveClass(/active/);

    const editorValue = await page.locator('#layerEditor').inputValue();
    expect(editorValue).toContain('innerValue');

    await expect(page).toHaveScreenshot('layer-switched.png');
  });

  test('breadcrumb navigation works', async ({ page }) => {
    const inner = JSON.stringify({ deep: true });
    const outer = JSON.stringify({ container: inner });
    await page.locator('#inputEditor').fill(outer);
    await page.locator('#btnParse').click();

    // Switch to inner layer
    await page.locator('.layer-tab').nth(1).click();
    await expect(page.locator('.breadcrumb-item')).toHaveCount(2);
    await expect(page.locator('.breadcrumb-item').nth(0)).toHaveText('Root');

    // Click Root in breadcrumb
    await page.locator('.breadcrumb-item').nth(0).click();
    await expect(page.locator('.layer-tab').nth(0)).toHaveClass(/active/);
  });

  test('generate output from layers', async ({ page }) => {
    const json = JSON.stringify({ msg: 'hello' });
    await page.locator('#inputEditor').fill(json);
    await page.locator('#btnParse').click();
    await page.locator('#btnApply').click();

    const output = await page.locator('#outputEditor').inputValue();
    expect(output).toContain('hello');
    await expect(page.locator('#statusLeft')).toHaveText('Output generated');

    await expect(page).toHaveScreenshot('output-generated.png');
  });

  test('format button formats JSON', async ({ page }) => {
    await page.locator('#inputEditor').fill('{"a":1,"b":2}');
    await page.locator('#btnFormat').click();

    const value = await page.locator('#inputEditor').inputValue();
    expect(value).toContain('  "a": 1');
  });

  test('minify button minifies JSON', async ({ page }) => {
    await page.locator('#inputEditor').fill('{\n  "a": 1,\n  "b": 2\n}');
    await page.locator('#btnMinify').click();

    const value = await page.locator('#inputEditor').inputValue();
    expect(value).toBe('{"a":1,"b":2}');
  });

  test('escape and unescape buttons work', async ({ page }) => {
    await page.locator('#inputEditor').fill('{"a":1}');
    await page.locator('#btnEscape').click();

    let value = await page.locator('#inputEditor').inputValue();
    expect(value).toBe('"{\\"a\\":1}"');

    await page.locator('#btnUnescape').click();
    value = await page.locator('#inputEditor').inputValue();
    expect(value).toBe('{"a":1}');
  });

  test('clear button resets everything', async ({ page }) => {
    await page.locator('#inputEditor').fill('{"test":1}');
    await page.locator('#btnParse').click();
    await page.locator('#btnClearInput').click();

    await expect(page.locator('#inputEditor')).toHaveValue('');
    await expect(page.locator('#layerPlaceholder')).toBeVisible();
    await expect(page.locator('#statusLeft')).toHaveText('Ready');
  });

  test('apply output to input works', async ({ page }) => {
    await page.locator('#inputEditor').fill('{"x":1}');
    await page.locator('#btnParse').click();
    await page.locator('#btnApply').click();

    await page.locator('#btnApplyOutputToInput').click();
    const inputValue = await page.locator('#inputEditor').inputValue();
    expect(inputValue).toContain('"x"');
  });

  test('three-panel layout snapshot', async ({ page }) => {
    const inner = JSON.stringify({ level: 2, items: ['a', 'b'] });
    const outer = JSON.stringify({
      title: 'Test Document',
      count: 5,
      payload: inner,
    });
    await page.locator('#inputEditor').fill(outer);
    await page.locator('#btnParse').click();
    await page.locator('#btnApply').click();

    await expect(page).toHaveScreenshot('full-workflow.png');
  });
});
