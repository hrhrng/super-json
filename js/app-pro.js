// Global state
let currentMode = 'layer';
let currentDocId = null;
let documents = {};
let editors = {};
let parsedLayers = [];
let currentLayerIndex = 0;
let isUpdating = false;
let saveTimer = null;

// Initialize Monaco
require.config({ paths: { 'vs': 'https://cdn.jsdelivr.net/npm/monaco-editor@0.44.0/min/vs' }});

require(['vs/editor/editor.main'], function() {
    // Hacker theme matching logo colors
    monaco.editor.defineTheme('superJSON', {
        base: 'vs-dark',
        inherit: true,
        rules: [
            { token: 'string.key.json', foreground: '00ffff' },  // Cyan
            { token: 'string.value.json', foreground: '8B5DFF' }, // Purple
            { token: 'number', foreground: '00ff88' },           // Neon green
            { token: 'keyword', foreground: 'ff0055' }           // Neon pink
        ],
        colors: {
            'editor.background': '#000000',
            'editor.foreground': '#1FB6FF',
            'editor.lineHighlightBackground': '#0a0a0a',
            'editorLineNumber.foreground': '#1FB6FF33',
            'editorIndentGuide.background': '#1FB6FF11',
            'editor.selectionBackground': '#1FB6FF22',
            'editorCursor.foreground': '#00ffff',
            'editorCursor.background': '#000000'
        }
    });
    
    // Set dark theme
    monaco.editor.setTheme('superJSON');
    
    // Initialize editors first
    initEditors();
    
    // Load from storage or create first document
    if (!loadFromStorage()) {
        createDocument();
        loadDocument();
    }
    
    // Restore preferred mode if set
    const preferredMode = localStorage.getItem('preferredMode');
    if (preferredMode && preferredMode !== 'layer') {
        setTimeout(() => switchMode(preferredMode), 100);
    }
});

// Enhanced JSON Layer Analyzer with deep scanning
class JSONLayerAnalyzer {
    constructor(maxDepth = 10) {  // Limit to 10 layers to prevent UI breakdown
        this.maxDepth = maxDepth;
        this.layers = [];
    }
    
    analyze(jsonString, parentField = null, currentDepth = 0) {
        if (currentDepth >= this.maxDepth) {
            if (currentDepth === this.maxDepth && !this.maxDepthWarned) {
                this.maxDepthWarned = true;
                console.warn(`Maximum depth of ${this.maxDepth} layers reached. Deeper layers will not be parsed.`);
            }
            return { type: 'max_depth_reached', value: jsonString };
        }
        
        try {
            const parsed = JSON.parse(jsonString);
            this.layers.push({
                depth: currentDepth,
                content: parsed,
                parentField: parentField,
                raw: jsonString,
                parentIndex: -1,
                childIndices: []
            });
            
            const currentIndex = this.layers.length - 1;
            
            // Deep scan all fields for escaped JSON
            this.scanForEscapedJSON(parsed, currentDepth, currentIndex);
            
            return parsed;
        } catch (e) {
            return jsonString;
        }
    }
    
    scanForEscapedJSON(obj, currentDepth, parentIndex, path = '') {
        if (obj === null || typeof obj !== 'object') return;
        
        if (Array.isArray(obj)) {
            obj.forEach((item, index) => {
                const itemPath = path ? `${path}[${index}]` : `[${index}]`;
                if (typeof item === 'string' && this.isLikelyJSON(item)) {
                    this.analyze(item, itemPath, currentDepth + 1);
                    const childIndex = this.layers.length - 1;
                    this.layers[childIndex].parentIndex = parentIndex;
                    this.layers[parentIndex].childIndices.push(childIndex);
                } else {
                    this.scanForEscapedJSON(item, currentDepth, parentIndex, itemPath);
                }
            });
        } else {
            Object.entries(obj).forEach(([key, value]) => {
                const fieldPath = path ? `${path}.${key}` : key;
                if (typeof value === 'string' && this.isLikelyJSON(value)) {
                    this.analyze(value, fieldPath, currentDepth + 1);
                    const childIndex = this.layers.length - 1;
                    this.layers[childIndex].parentIndex = parentIndex;
                    this.layers[parentIndex].childIndices.push(childIndex);
                } else {
                    this.scanForEscapedJSON(value, currentDepth, parentIndex, fieldPath);
                }
            });
        }
    }
    
    isLikelyJSON(str) {
        const trimmed = str.trim();
        return (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
               (trimmed.startsWith('[') && trimmed.endsWith(']'));
    }
    
    getNestedValue(obj, path) {
        const keys = path.match(/[^.\[\]]+/g) || [];
        let current = obj;
        
        for (const key of keys) {
            if (current === null || current === undefined) return undefined;
            current = current[key];
        }
        
        return current;
    }
    
    setNestedValue(obj, path, value) {
        const keys = path.match(/[^.\[\]]+/g) || [];
        let current = obj;
        
        for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i];
            const nextKey = keys[i + 1];
            const isArrayIndex = /^\d+$/.test(nextKey);
            
            if (!(key in current)) {
                current[key] = isArrayIndex ? [] : {};
            }
            current = current[key];
        }
        
        const lastKey = keys[keys.length - 1];
        current[lastKey] = value;
    }
}

// Document management
function createDocument() {
    const id = 'doc_' + Date.now();
    documents[id] = {
        id: id,
        name: `Document ${Object.keys(documents).length + 1}`,
        input: '',
        output: '',
        layers: [],
        currentLayer: 0,
        mode: 'layer'
    };
    currentDocId = id;
    renderTabs();
    return id;
}

function switchDocument(id) {
    if (id === currentDocId) return;
    
    saveCurrentDocument();
    
    // Dispose layer editors
    Object.keys(editors).forEach(key => {
        if (key.startsWith('layer_')) {
            editors[key].dispose();
            delete editors[key];
        }
    });
    
    currentDocId = id;
    loadDocument();
    renderTabs();
}

function saveCurrentDocument() {
    if (!documents[currentDocId]) return;
    
    const doc = documents[currentDocId];
    doc.input = editors.input?.getValue() || '';
    doc.output = editors.output?.getValue() || '';
    doc.layers = parsedLayers;
    doc.currentLayer = currentLayerIndex;
}

function loadDocument() {
    const doc = documents[currentDocId];
    if (!doc) return;
    
    editors.input?.setValue(doc.input || '');
    editors.output?.setValue(doc.output || '');
    parsedLayers = doc.layers || [];
    currentLayerIndex = doc.currentLayer || 0;
    
    if (parsedLayers.length > 0) {
        renderLayers();
        switchLayer(currentLayerIndex);
    } else {
        document.getElementById('layerTabs').innerHTML = '';
        document.getElementById('layerInfo').textContent = 'Not Parsed';
        const actionBtns = document.getElementById('layerActionBtns');
        if (actionBtns) actionBtns.style.display = 'none';
    }
    
    updateLayerCount();
}

function closeDocument(docId) {
    if (Object.keys(documents).length <= 1) {
        showNotification('Cannot close last document', 'error');
        return;
    }
    
    delete documents[docId];
    
    if (currentDocId === docId) {
        currentDocId = Object.keys(documents)[0];
        loadDocument();
    }
    
    renderTabs();
    saveToStorage();
}

function addNewDocument() {
    saveCurrentDocument();
    createDocument();
    loadDocument();
    saveToStorage();
}

function editTabName(e, docId) {
    e.stopPropagation();
    const span = e.target;
    const oldName = documents[docId].name;
    
    const input = document.createElement('input');
    input.type = 'text';
    input.value = oldName;
    input.style.cssText = 'background: #000; border: 1px solid #1FB6FF; color: #00ffff; padding: 2px 6px; border-radius: 0; font: inherit;';
    
    input.onblur = () => {
        const newName = input.value.trim() || oldName;
        documents[docId].name = newName;
        span.textContent = newName;
        saveToStorage();
    };
    
    input.onkeydown = (evt) => {
        if (evt.key === 'Enter') input.blur();
        if (evt.key === 'Escape') {
            input.value = oldName;
            input.blur();
        }
    };
    
    span.textContent = '';
    span.appendChild(input);
    input.focus();
    input.select();
}

function renderTabs() {
    const container = document.getElementById('mainTabs');
    const tabs = Object.values(documents).map(doc => `
        <div class="tab ${doc.id === currentDocId ? 'active' : ''}" onclick="switchDocument('${doc.id}')">
            <span ondblclick="editTabName(event, '${doc.id}')">${doc.name}</span>
            <span class="tab-close" onclick="event.stopPropagation(); closeDocument('${doc.id}')">×</span>
        </div>
    `).join('');
    
    container.innerHTML = tabs + '<div class="tab-add" onclick="addNewDocument()">+</div>';
}

// Mode switching
function switchMode(mode) {
    // Don't switch if already in the same mode
    if (currentMode === mode) return;
    
    // Save current document state before switching
    if (currentDocId && documents[currentDocId]) {
        saveCurrentDocument();
    }
    
    currentMode = mode;
    
    // Update UI
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mode === mode);
    });
    
    document.getElementById('layerActions').style.display = mode === 'layer' ? 'flex' : 'none';
    document.getElementById('processorActions').style.display = mode === 'processor' ? 'flex' : 'none';
    document.getElementById('layerMode').style.display = mode === 'layer' ? 'flex' : 'none';
    document.getElementById('processorMode').style.display = mode === 'processor' ? 'flex' : 'none';
    
    // Handle Hero mode
    const heroMode = document.getElementById('heroMode');
    if (heroMode) {
        heroMode.style.display = mode === 'hero' ? 'flex' : 'none';
    }
    
    if (mode === 'processor') {
        if (!editors.procInput) {
            initProcessorEditors();
        }
        // Share the same content between layer and processor modes
        if (documents[currentDocId] && documents[currentDocId].input && editors.procInput) {
            editors.procInput.setValue(documents[currentDocId].input);
        }
    } else if (mode === 'hero') {
        // Initialize Hero editor if needed
        if (typeof initHeroEditor === 'function') {
            setTimeout(() => {
                initHeroEditor();
                // Load current document content into Hero editor
                if (window.heroInputEditor && documents[currentDocId] && documents[currentDocId].input) {
                    window.heroInputEditor.setValue(documents[currentDocId].input);
                }
            }, 100);
        }
    }
    
    // Save mode preference
    localStorage.setItem('preferredMode', mode);
}

// Editor initialization
function initEditors() {
    const editorConfig = {
        language: 'json',
        theme: 'superJSON',
        automaticLayout: true,
        minimap: { enabled: false },
        fontSize: 13,
        lineNumbers: 'on',
        folding: true,
        scrollBeyondLastLine: false,
        wordWrap: 'on',
        formatOnPaste: true,
        formatOnType: true
    };
    
    editors.input = monaco.editor.create(document.getElementById('inputEditor'), {
        ...editorConfig,
        value: ''
    });
    
    editors.output = monaco.editor.create(document.getElementById('outputEditor'), {
        ...editorConfig,
        value: '',
        readOnly: true
    });
    
    // Debounced auto-save
    editors.input.onDidChangeModelContent(() => {
        clearTimeout(saveTimer);
        saveTimer = setTimeout(() => {
            saveCurrentDocument();
            saveToStorage();
        }, 3000);
    });
}

function initProcessorEditors() {
    const editorConfig = {
        language: 'json',
        theme: 'superJSON',
        automaticLayout: true,
        minimap: { enabled: false },
        fontSize: 13,
        lineNumbers: 'on',
        folding: true,
        scrollBeyondLastLine: false,
        wordWrap: 'on'
    };
    
    // Initialize with current document content if available
    const initialValue = (documents[currentDocId] && documents[currentDocId].input) || '';
    
    editors.procInput = monaco.editor.create(document.getElementById('procInputEditor'), {
        ...editorConfig,
        value: initialValue
    });
    
    editors.procOutput = monaco.editor.create(document.getElementById('procOutputEditor'), {
        ...editorConfig,
        value: '',
        readOnly: true
    });
}

// JSON Analysis with bidirectional sync
function analyzeJSON() {
    const input = editors.input.getValue();
    if (!input.trim()) {
        showNotification('请输入JSON内容', 'error');
        return;
    }
    
    const analyzer = new JSONLayerAnalyzer();
    try {
        analyzer.analyze(input);
        parsedLayers = analyzer.layers;
        
        if (parsedLayers.length === 0) {
            showNotification('未检测到有效的JSON', 'error');
            return;
        }
        
        renderLayers();
        switchLayer(0);
        updateStatus('active');
        
        // Check if max depth was reached
        let message = `Successfully parsed ${parsedLayers.length} layers`;
        if (parsedLayers.length >= 10) {
            message += ' (max depth reached)';
        }
        showNotification(message, 'success');
        
        saveCurrentDocument();
        saveToStorage();
    } catch (e) {
        showNotification('解析错误: ' + e.message, 'error');
        updateStatus('error');
    }
}

function renderLayers() {
    const info = document.getElementById('layerInfo');
    const actionBtns = document.getElementById('layerActionBtns');
    
    if (parsedLayers.length === 0) {
        info.textContent = 'Not Parsed';
        if (actionBtns) actionBtns.style.display = 'none';
        // Clear breadcrumb and dropdown
        const breadcrumb = document.getElementById('layerBreadcrumb');
        const dropdown = document.getElementById('layerDropdown');
        if (breadcrumb) breadcrumb.innerHTML = '';
        if (dropdown) dropdown.innerHTML = '';
        return;
    }
    
    info.textContent = `${parsedLayers.length} Layers`;
    if (actionBtns) actionBtns.style.display = 'flex';
    
    // Render breadcrumb navigation instead of tabs
    if (typeof window.renderBreadcrumb === 'function') {
        window.renderBreadcrumb(currentLayerIndex);
    }
}

function switchLayer(index) {
    if (index === currentLayerIndex && editors[`layer_${index}`]) return;
    
    currentLayerIndex = index;
    
    // Update breadcrumb navigation
    if (typeof window.renderBreadcrumb === 'function') {
        window.renderBreadcrumb(index);
    }
    
    // Create or show editor
    const editorKey = `layer_${index}`;
    const container = document.getElementById('layerEditor');
    
    // Hide all layer editors
    Object.keys(editors).forEach(key => {
        if (key.startsWith('layer_') && editors[key].getDomNode) {
            editors[key].getDomNode().style.display = 'none';
        }
    });
    
    if (!editors[editorKey]) {
        // Create new editor
        const layer = parsedLayers[index];
        editors[editorKey] = monaco.editor.create(container, {
            value: JSON.stringify(layer.content, null, 2),
            language: 'json',
            theme: 'superJSON',
            automaticLayout: true,
            minimap: { enabled: false },
            fontSize: 13,
            lineNumbers: 'on',
            folding: true,
            scrollBeyondLastLine: false,
            wordWrap: 'on'
        });
        
        // Add change listener for bidirectional sync
        editors[editorKey].onDidChangeModelContent(() => {
            if (!isUpdating) {
                handleLayerEdit(index);
            }
        });
    } else {
        // Show existing editor
        editors[editorKey].getDomNode().style.display = 'block';
        editors[editorKey].layout();
    }
}

function handleLayerEdit(index) {
    const editorKey = `layer_${index}`;
    const newContent = editors[editorKey].getValue();
    
    try {
        const parsed = JSON.parse(newContent);
        parsedLayers[index].content = parsed;
        
        // Mark tab as modified
        const tab = document.querySelectorAll('.layer-tab')[index];
        if (tab) {
            tab.classList.add('modified');
        }
        
        // Show sync status
        const syncStatus = document.getElementById('syncStatus');
        syncStatus.style.display = 'flex';
        
        // Bidirectional sync
        updateChildLayers(index);
        updateParentLayers(index);
        
        setTimeout(() => {
            syncStatus.style.display = 'none';
        }, 1000);
        
        // Auto-save
        clearTimeout(saveTimer);
        saveTimer = setTimeout(() => {
            saveCurrentDocument();
            saveToStorage();
        }, 3000);
        
    } catch (e) {
        // Invalid JSON, don't sync
    }
}

function updateChildLayers(parentIndex) {
    const parentLayer = parsedLayers[parentIndex];
    const analyzer = new JSONLayerAnalyzer();
    
    // Update all child layers
    parentLayer.childIndices.forEach(childIndex => {
        const childLayer = parsedLayers[childIndex];
        if (childLayer && childLayer.parentField) {
            const fieldValue = analyzer.getNestedValue(parentLayer.content, childLayer.parentField);
            
            if (typeof fieldValue === 'string' && analyzer.isLikelyJSON(fieldValue)) {
                try {
                    const parsed = JSON.parse(fieldValue);
                    childLayer.content = parsed;
                    
                    // Update editor if exists
                    const editorKey = `layer_${childIndex}`;
                    if (editors[editorKey]) {
                        isUpdating = true;
                        const position = editors[editorKey].getPosition();
                        editors[editorKey].setValue(JSON.stringify(parsed, null, 2));
                        editors[editorKey].setPosition(position);
                        isUpdating = false;
                    }
                    
                    // Recursively update children
                    updateChildLayers(childIndex);
                } catch (e) {
                    // Invalid JSON
                }
            }
        }
    });
}

function updateParentLayers(childIndex) {
    const childLayer = parsedLayers[childIndex];
    if (childLayer.parentIndex < 0 || !childLayer.parentField) return;
    
    const parentLayer = parsedLayers[childLayer.parentIndex];
    if (!parentLayer) return;
    
    const analyzer = new JSONLayerAnalyzer();
    
    // Update parent field with stringified child content
    const updatedContent = JSON.stringify(childLayer.content);
    analyzer.setNestedValue(parentLayer.content, childLayer.parentField, updatedContent);
    
    // Update parent editor if exists
    const editorKey = `layer_${childLayer.parentIndex}`;
    if (editors[editorKey]) {
        isUpdating = true;
        const position = editors[editorKey].getPosition();
        editors[editorKey].setValue(JSON.stringify(parentLayer.content, null, 2));
        editors[editorKey].setPosition(position);
        isUpdating = false;
    }
    
    // Recursively update parent's parent
    updateParentLayers(childLayer.parentIndex);
}

function generateOutput() {
    if (parsedLayers.length === 0) {
        showNotification('请先分析JSON', 'error');
        return;
    }
    
    try {
        // Rebuild from root layer with all nested changes
        const rootLayer = parsedLayers[0];
        const output = JSON.stringify(rootLayer.content, null, 2);
        
        editors.output.setValue(output);
        updateStatus('active');
        showNotification('输出生成成功', 'success');
        
        saveCurrentDocument();
        saveToStorage();
    } catch (e) {
        showNotification('生成失败: ' + e.message, 'error');
        updateStatus('error');
    }
}

// Processor functions
function formatJSON() {
    processJSON(str => {
        const parsed = JSON.parse(str);
        return JSON.stringify(parsed, null, 2);
    });
}

function minifyJSON() {
    processJSON(str => {
        const parsed = JSON.parse(str);
        return JSON.stringify(parsed);
    });
}

function validateJSON() {
    if (!editors.procInput) return;
    
    try {
        const input = editors.procInput.getValue();
        JSON.parse(input);
        editors.procOutput.setValue('✅ JSON 格式有效\n\n' + input);
        showNotification('JSON 验证通过', 'success');
    } catch (e) {
        editors.procOutput.setValue(`❌ JSON 格式无效\n\n错误: ${e.message}`);
        showNotification('JSON 验证失败', 'error');
    }
}

function escapeJSON() {
    processJSON(str => {
        JSON.parse(str); // Validate
        return JSON.stringify(str);
    });
}

function unescapeJSON() {
    processJSON(str => {
        const unescaped = JSON.parse(str);
        return typeof unescaped === 'string' ? unescaped : JSON.stringify(unescaped, null, 2);
    });
}

function sortKeys() {
    processJSON(str => {
        const parsed = JSON.parse(str);
        return JSON.stringify(sortObject(parsed), null, 2);
    });
}

function sortObject(obj) {
    if (Array.isArray(obj)) {
        return obj.map(sortObject);
    } else if (obj && typeof obj === 'object') {
        return Object.keys(obj).sort().reduce((acc, key) => {
            acc[key] = sortObject(obj[key]);
            return acc;
        }, {});
    }
    return obj;
}

function base64Encode() {
    if (!editors.procInput) return;
    const input = editors.procInput.getValue();
    try {
        const encoded = btoa(unescape(encodeURIComponent(input)));
        editors.procOutput.setValue(encoded);
        showNotification('Base64 编码成功', 'success');
    } catch (e) {
        showNotification('编码失败', 'error');
    }
}

function base64Decode() {
    if (!editors.procInput) return;
    try {
        const input = editors.procInput.getValue().trim();
        const decoded = decodeURIComponent(escape(atob(input)));
        editors.procOutput.setValue(decoded);
        showNotification('Base64 解码成功', 'success');
    } catch (e) {
        showNotification('Decoding failed', 'error');
    }
}

function urlEncode() {
    if (!editors.procInput) return;
    const input = editors.procInput.getValue();
    const encoded = encodeURIComponent(input);
    editors.procOutput.setValue(encoded);
    showNotification('URL encoded successfully', 'success');
}

function urlDecode() {
    if (!editors.procInput) return;
    try {
        const input = editors.procInput.getValue();
        const decoded = decodeURIComponent(input);
        editors.procOutput.setValue(decoded);
        showNotification('URL decoded successfully', 'success');
    } catch (e) {
        showNotification('Decoding failed', 'error');
    }
}

function processJSON(fn) {
    if (!editors.procInput) return;
    
    try {
        const input = editors.procInput.getValue();
        const result = fn(input);
        editors.procOutput.setValue(result);
        showNotification('处理成功', 'success');
    } catch (e) {
        showNotification('处理失败: ' + e.message, 'error');
    }
}

function copyOutput() {
    const output = editors.procOutput?.getValue() || '';
    if (!output) {
        showNotification('没有内容可复制', 'error');
        return;
    }
    
    navigator.clipboard.writeText(output).then(() => {
        showNotification('已复制到剪贴板', 'success');
    }).catch(() => {
        showNotification('复制失败', 'error');
    });
}

function clearAll() {
    if (editors.procInput) editors.procInput.setValue('');
    if (editors.procOutput) editors.procOutput.setValue('');
    showNotification('已清空', 'success');
}

// Storage
function saveToStorage() {
    try {
        saveCurrentDocument();
        
        const data = {
            documents,
            currentDocId,
            currentMode,
            version: '3.0'
        };
        
        localStorage.setItem('superJSONEditor', JSON.stringify(data));
        
        // Show save indicator briefly
        const saveStatus = document.getElementById('saveStatus');
        saveStatus.style.display = 'flex';
        setTimeout(() => {
            saveStatus.style.display = 'none';
        }, 800);
    } catch (e) {
        console.error('Save failed:', e);
    }
}

function loadFromStorage() {
    try {
        const saved = localStorage.getItem('superJSONEditor');
        if (!saved) return false;
        
        const data = JSON.parse(saved);
        if (data.version === '3.0' && data.documents && Object.keys(data.documents).length > 0) {
            documents = data.documents;
            currentDocId = data.currentDocId || Object.keys(documents)[0];
            
            renderTabs();
            loadDocument();
            
            if (data.currentMode) {
                switchMode(data.currentMode);
            }
            
            return true;
        }
        
        return false;
    } catch (e) {
        console.error('Load failed:', e);
        return false;
    }
}

// Utilities
function updateStatus(status = '') {
    const dot = document.getElementById('statusDot');
    const text = document.getElementById('statusText');
    
    dot.className = status ? `status-dot ${status}` : 'status-dot';
    
    if (status === 'active') {
        text.textContent = 'Active';
    } else if (status === 'error') {
        text.textContent = 'Error';
    } else {
        text.textContent = 'Ready';
    }
}

function updateLayerCount() {
    document.getElementById('layerCount').textContent = `Layers: ${parsedLayers.length}`;
}

function showNotification(message, type = '') {
    const notif = document.getElementById('notification');
    notif.textContent = message;
    notif.className = `notification show ${type}`;
    
    setTimeout(() => {
        notif.classList.remove('show');
    }, 2500);
}

// Panel resizing
let resizing = false;
let resizeTarget = null;
let startX = 0;
let startWidth = 0;

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.resizer').forEach(resizer => {
        resizer.addEventListener('mousedown', e => {
            resizing = true;
            resizeTarget = resizer.parentElement;
            startX = e.clientX;
            startWidth = resizeTarget.offsetWidth;
            document.body.style.cursor = 'col-resize';
            e.preventDefault();
        });
    });
});

document.addEventListener('mousemove', e => {
    if (!resizing) return;
    
    const newWidth = startWidth + (e.clientX - startX);
    let maxWidth = 400; // Default max width
    let minWidth = 250;
    
    // Different constraints for different panels
    if (resizeTarget.classList.contains('panel-layer')) {
        maxWidth = window.innerWidth * 0.5; // Layer panel can be up to 50%
        minWidth = 350;
    } else if (resizeTarget.classList.contains('panel-input') || resizeTarget.classList.contains('panel-output')) {
        maxWidth = 400; // Input/output panels limited to 400px
        minWidth = 250;
    }
    
    if (newWidth >= minWidth && newWidth <= maxWidth) {
        resizeTarget.style.width = newWidth + 'px';
        resizeTarget.style.flex = `0 0 ${newWidth}px`;
    }
});

document.addEventListener('mouseup', () => {
    if (resizing) {
        resizing = false;
        resizeTarget = null;
        document.body.style.cursor = 'default';
    }
});

// Keyboard shortcuts
document.addEventListener('keydown', e => {
    if (e.ctrlKey || e.metaKey) {
        switch(e.key) {
            case 'Enter':
                e.preventDefault();
                if (currentMode === 'layer') analyzeJSON();
                break;
            case 's':
                e.preventDefault();
                if (currentMode === 'layer') generateOutput();
                break;
            case 't':
                e.preventDefault();
                addNewDocument();
                break;
            case 'w':
                e.preventDefault();
                if (currentDocId) closeDocument(currentDocId);
                break;
        }
    }
});

// Prevent accidental close
window.addEventListener('beforeunload', e => {
    if (parsedLayers.length > 0) {
        e.preventDefault();
        e.returnValue = '';
    }
});

// Export functions for HTML usage
window.createDocument = createDocument;
window.switchDocument = switchDocument;
window.saveCurrentDocument = saveCurrentDocument;
window.handleLayerEdit = handleLayerEdit;
window.showNotification = showNotification;

// Export data as getters so they're always current
Object.defineProperty(window, 'documents', {
    get: function() { return documents; }
});

Object.defineProperty(window, 'editors', {
    get: function() { return editors; }
});

Object.defineProperty(window, 'parsedLayers', {
    get: function() { return parsedLayers; },
    set: function(val) { parsedLayers = val; }
});

Object.defineProperty(window, 'currentLayerIndex', {
    get: function() { return currentLayerIndex; },
    set: function(val) { currentLayerIndex = val; }
});

Object.defineProperty(window, 'currentDocId', {
    get: function() { return currentDocId; }
});