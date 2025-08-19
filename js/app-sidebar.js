// Global variables
let parsedLayers = [];
let editors = {};
let currentDocId = null;
let documents = {};
let isUpdating = false;
let currentMode = 'layer';
let processorInputEditor = null;
let processorOutputEditor = null;

// Initialize Monaco Editor
require.config({ paths: { 'vs': 'https://cdn.jsdelivr.net/npm/monaco-editor@0.44.0/min/vs' }});

require(['vs/editor/editor.main'], function() {
    monaco.editor.defineTheme('customDark', {
        base: 'vs-dark',
        inherit: true,
        rules: [],
        colors: {
            'editor.background': '#0d1117',
            'editor.foreground': '#e6edf3',
            'editor.lineHighlightBackground': '#161b22',
            'editorLineNumber.foreground': '#8b949e',
            'editorIndentGuide.background': '#21262d',
            'editor.selectionBackground': '#1f6feb66',
            'editorCursor.foreground': '#58a6ff'
        }
    });
    
    monaco.editor.setTheme('customDark');
    
    // Initialize with a default document
    if (Object.keys(documents).length === 0) {
        const defaultDoc = createDocument();
        documents[defaultDoc.id] = defaultDoc;
        currentDocId = defaultDoc.id;
    }
    
    renderMainTabs();
    initializeEditors();
    loadDocumentsFromStorage();
    
    // Set up auto-save
    setInterval(() => {
        saveDocumentsToStorage();
    }, 5000);
});

// Mode switching
function switchMode(mode) {
    currentMode = mode;
    
    // Update sidebar tabs
    document.querySelectorAll('.sidebar-tab').forEach(tab => {
        tab.classList.remove('active');
        if (tab.dataset.mode === mode) {
            tab.classList.add('active');
        }
    });
    
    // Update toolbars
    document.getElementById('layerToolbar').style.display = mode === 'layer' ? 'flex' : 'none';
    document.getElementById('processorToolbar').style.display = mode === 'processor' ? 'flex' : 'none';
    
    // Update main content
    document.getElementById('layerMode').style.display = mode === 'layer' ? 'flex' : 'none';
    document.getElementById('processorMode').style.display = mode === 'processor' ? 'flex' : 'none';
    
    // Initialize processor editors if needed
    if (mode === 'processor' && !processorInputEditor) {
        initializeProcessorEditors();
    }
}

// Initialize processor editors
function initializeProcessorEditors() {
    const inputContainer = document.getElementById('processorInputEditor');
    const outputContainer = document.getElementById('processorOutputEditor');
    
    // Clear welcome screens
    inputContainer.innerHTML = '';
    outputContainer.innerHTML = '';
    
    processorInputEditor = monaco.editor.create(inputContainer, {
        value: '',
        language: 'json',
        theme: 'customDark',
        automaticLayout: true,
        minimap: { enabled: false },
        fontSize: 14,
        wordWrap: 'on',
        formatOnPaste: true,
        formatOnType: true
    });
    
    processorOutputEditor = monaco.editor.create(outputContainer, {
        value: '',
        language: 'json',
        theme: 'customDark',
        automaticLayout: true,
        minimap: { enabled: false },
        fontSize: 14,
        wordWrap: 'on',
        readOnly: true
    });
    
    // Add change listener for stats update
    processorInputEditor.onDidChangeModelContent(debounce(() => {
        updateJSONStats();
    }, 300));
}

// JSON Processor Functions
function formatJSON() {
    if (!processorInputEditor) return;
    
    try {
        const input = processorInputEditor.getValue();
        const parsed = JSON.parse(input);
        const indentSize = parseInt(document.getElementById('indentSize').value) || 2;
        const sortKeys = document.getElementById('sortKeysOption').checked;
        
        let formatted;
        if (sortKeys) {
            formatted = JSON.stringify(sortObject(parsed), null, indentSize);
        } else {
            formatted = JSON.stringify(parsed, null, indentSize);
        }
        
        processorOutputEditor.setValue(formatted);
        updateStatus('processorOutputStatus', 'active');
        showNotification('JSON 格式化成功', 'success');
    } catch (e) {
        showNotification('JSON 格式错误: ' + e.message, 'error');
        updateStatus('processorOutputStatus', 'error');
    }
}

function minifyJSON() {
    if (!processorInputEditor) return;
    
    try {
        const input = processorInputEditor.getValue();
        const parsed = JSON.parse(input);
        const minified = JSON.stringify(parsed);
        
        processorOutputEditor.setValue(minified);
        updateStatus('processorOutputStatus', 'active');
        
        const originalSize = new Blob([input]).size;
        const minifiedSize = new Blob([minified]).size;
        const reduction = ((originalSize - minifiedSize) / originalSize * 100).toFixed(1);
        
        showNotification(`压缩成功！减少了 ${reduction}% 的大小`, 'success');
    } catch (e) {
        showNotification('JSON 格式错误: ' + e.message, 'error');
        updateStatus('processorOutputStatus', 'error');
    }
}

function validateJSON() {
    if (!processorInputEditor) return;
    
    try {
        const input = processorInputEditor.getValue();
        JSON.parse(input);
        
        processorOutputEditor.setValue('✅ JSON 格式有效\n\n' + input);
        updateStatus('processorOutputStatus', 'active');
        showNotification('JSON 验证通过', 'success');
    } catch (e) {
        const errorMsg = `❌ JSON 格式无效\n\n错误信息:\n${e.message}\n\n位置: ${e.lineNumber ? '第 ' + e.lineNumber + ' 行' : '未知'}`;
        processorOutputEditor.setValue(errorMsg);
        updateStatus('processorOutputStatus', 'error');
        showNotification('JSON 验证失败: ' + e.message, 'error');
    }
}

function escapeJSON() {
    if (!processorInputEditor) return;
    
    try {
        const input = processorInputEditor.getValue();
        JSON.parse(input); // Validate first
        const escaped = JSON.stringify(input);
        
        processorOutputEditor.setValue(escaped);
        updateStatus('processorOutputStatus', 'active');
        showNotification('JSON 转义成功', 'success');
    } catch (e) {
        showNotification('JSON 格式错误: ' + e.message, 'error');
        updateStatus('processorOutputStatus', 'error');
    }
}

function unescapeJSON() {
    if (!processorInputEditor) return;
    
    try {
        const input = processorInputEditor.getValue();
        const unescaped = JSON.parse(input);
        
        if (typeof unescaped === 'string') {
            processorOutputEditor.setValue(unescaped);
        } else {
            processorOutputEditor.setValue(JSON.stringify(unescaped, null, 2));
        }
        
        updateStatus('processorOutputStatus', 'active');
        showNotification('JSON 反转义成功', 'success');
    } catch (e) {
        showNotification('反转义失败: ' + e.message, 'error');
        updateStatus('processorOutputStatus', 'error');
    }
}

function sortKeys() {
    if (!processorInputEditor) return;
    
    try {
        const input = processorInputEditor.getValue();
        const parsed = JSON.parse(input);
        const sorted = JSON.stringify(sortObject(parsed), null, 2);
        
        processorOutputEditor.setValue(sorted);
        updateStatus('processorOutputStatus', 'active');
        showNotification('键排序成功', 'success');
    } catch (e) {
        showNotification('JSON 格式错误: ' + e.message, 'error');
        updateStatus('processorOutputStatus', 'error');
    }
}

function sortObject(obj) {
    if (Array.isArray(obj)) {
        return obj.map(sortObject);
    } else if (obj !== null && typeof obj === 'object') {
        return Object.keys(obj).sort().reduce((result, key) => {
            result[key] = sortObject(obj[key]);
            return result;
        }, {});
    }
    return obj;
}

// Base64 operations
function base64Encode() {
    if (!processorInputEditor) return;
    
    try {
        const input = processorInputEditor.getValue();
        const encoded = btoa(unescape(encodeURIComponent(input)));
        
        processorOutputEditor.setValue(encoded);
        updateStatus('processorOutputStatus', 'active');
        showNotification('Base64 编码成功', 'success');
    } catch (e) {
        showNotification('编码失败: ' + e.message, 'error');
        updateStatus('processorOutputStatus', 'error');
    }
}

function base64Decode() {
    if (!processorInputEditor) return;
    
    try {
        const input = processorInputEditor.getValue().trim();
        const decoded = decodeURIComponent(escape(atob(input)));
        
        processorOutputEditor.setValue(decoded);
        updateStatus('processorOutputStatus', 'active');
        showNotification('Base64 解码成功', 'success');
    } catch (e) {
        showNotification('解码失败: ' + e.message, 'error');
        updateStatus('processorOutputStatus', 'error');
    }
}

// URL operations
function urlEncode() {
    if (!processorInputEditor) return;
    
    const input = processorInputEditor.getValue();
    const encoded = encodeURIComponent(input);
    
    processorOutputEditor.setValue(encoded);
    updateStatus('processorOutputStatus', 'active');
    showNotification('URL 编码成功', 'success');
}

function urlDecode() {
    if (!processorInputEditor) return;
    
    try {
        const input = processorInputEditor.getValue();
        const decoded = decodeURIComponent(input);
        
        processorOutputEditor.setValue(decoded);
        updateStatus('processorOutputStatus', 'active');
        showNotification('URL 解码成功', 'success');
    } catch (e) {
        showNotification('解码失败: ' + e.message, 'error');
        updateStatus('processorOutputStatus', 'error');
    }
}

// Processor utility functions
function loadSample() {
    const sampleJSON = {
        "name": "Sample User",
        "age": 30,
        "email": "user@example.com",
        "address": {
            "street": "123 Main St",
            "city": "New York",
            "country": "USA"
        },
        "hobbies": ["reading", "coding", "gaming"],
        "isActive": true,
        "metadata": "{\"created\":\"2024-01-01\",\"updated\":\"2024-01-15\"}"
    };
    
    if (processorInputEditor) {
        processorInputEditor.setValue(JSON.stringify(sampleJSON, null, 2));
        updateJSONStats();
    }
}

function clearProcessor() {
    if (processorInputEditor) {
        processorInputEditor.setValue('');
        processorOutputEditor.setValue('');
        updateJSONStats();
    }
}

function copyProcessorOutput() {
    if (!processorOutputEditor) return;
    
    const output = processorOutputEditor.getValue();
    navigator.clipboard.writeText(output).then(() => {
        showNotification('已复制到剪贴板', 'success');
    }).catch(() => {
        showNotification('复制失败', 'error');
    });
}

function downloadProcessorOutput() {
    if (!processorOutputEditor) return;
    
    const output = processorOutputEditor.getValue();
    const blob = new Blob([output], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `processed-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showNotification('下载成功', 'success');
}

function updateJSONStats() {
    if (!processorInputEditor) return;
    
    const input = processorInputEditor.getValue();
    
    if (!input) {
        document.getElementById('statSize').textContent = '0 B';
        document.getElementById('statKeys').textContent = '0';
        document.getElementById('statDepth').textContent = '0';
        document.getElementById('statType').textContent = '未知';
        return;
    }
    
    try {
        const parsed = JSON.parse(input);
        
        // Size
        const size = new Blob([input]).size;
        const sizeStr = size < 1024 ? size + ' B' : 
                       size < 1024 * 1024 ? (size / 1024).toFixed(1) + ' KB' :
                       (size / (1024 * 1024)).toFixed(1) + ' MB';
        document.getElementById('statSize').textContent = sizeStr;
        
        // Keys count
        const keyCount = countKeys(parsed);
        document.getElementById('statKeys').textContent = keyCount;
        
        // Depth
        const depth = getDepth(parsed);
        document.getElementById('statDepth').textContent = depth;
        
        // Type
        const type = Array.isArray(parsed) ? 'Array' : 
                    parsed === null ? 'Null' :
                    typeof parsed === 'object' ? 'Object' : 
                    typeof parsed;
        document.getElementById('statType').textContent = type;
        
    } catch (e) {
        document.getElementById('statType').textContent = '无效';
    }
}

function countKeys(obj, count = 0) {
    if (obj === null || typeof obj !== 'object') return count;
    
    if (Array.isArray(obj)) {
        for (const item of obj) {
            count = countKeys(item, count);
        }
    } else {
        count += Object.keys(obj).length;
        for (const key in obj) {
            count = countKeys(obj[key], count);
        }
    }
    
    return count;
}

function getDepth(obj, currentDepth = 0) {
    if (obj === null || typeof obj !== 'object') return currentDepth;
    
    let maxDepth = currentDepth;
    
    if (Array.isArray(obj)) {
        for (const item of obj) {
            maxDepth = Math.max(maxDepth, getDepth(item, currentDepth + 1));
        }
    } else {
        for (const key in obj) {
            maxDepth = Math.max(maxDepth, getDepth(obj[key], currentDepth + 1));
        }
    }
    
    return maxDepth;
}

// Enhanced JSON Layer Analyzer with deep field detection
class JSONLayerAnalyzer {
    constructor(maxDepth = 10) {
        this.maxDepth = maxDepth;
        this.layers = [];
    }
    
    analyze(jsonString, parentField = null, currentDepth = 0) {
        if (currentDepth >= this.maxDepth) {
            return { type: 'max_depth_reached', value: jsonString };
        }
        
        try {
            const parsed = JSON.parse(jsonString);
            this.layers.push({
                depth: currentDepth,
                content: parsed,
                parentField: parentField,
                raw: jsonString
            });
            
            // Deep scan all fields for escaped JSON
            this.scanForEscapedJSON(parsed, currentDepth);
            
            return parsed;
        } catch (e) {
            return jsonString;
        }
    }
    
    scanForEscapedJSON(obj, currentDepth, path = '') {
        if (obj === null || typeof obj !== 'object') return;
        
        if (Array.isArray(obj)) {
            obj.forEach((item, index) => {
                const itemPath = path ? `${path}[${index}]` : `[${index}]`;
                if (typeof item === 'string' && this.isLikelyJSON(item)) {
                    this.analyze(item, itemPath, currentDepth + 1);
                } else {
                    this.scanForEscapedJSON(item, currentDepth, itemPath);
                }
            });
        } else {
            Object.entries(obj).forEach(([key, value]) => {
                const fieldPath = path ? `${path}.${key}` : key;
                if (typeof value === 'string' && this.isLikelyJSON(value)) {
                    this.analyze(value, fieldPath, currentDepth + 1);
                } else {
                    this.scanForEscapedJSON(value, currentDepth, fieldPath);
                }
            });
        }
    }
    
    isLikelyJSON(str) {
        const trimmed = str.trim();
        return (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
               (trimmed.startsWith('[') && trimmed.endsWith(']'));
    }
    
    rebuild(layers) {
        if (layers.length === 0) return '';
        
        // Build from deepest to shallowest
        const sortedLayers = [...layers].sort((a, b) => b.depth - a.depth);
        const rebuilt = {};
        
        sortedLayers.forEach(layer => {
            const key = `layer_${layer.depth}_${layer.parentField || 'root'}`;
            rebuilt[key] = layer.content;
        });
        
        // Reconstruct by replacing escaped JSON strings
        let result = JSON.parse(JSON.stringify(layers[0].content));
        
        for (let i = 1; i < layers.length; i++) {
            const layer = layers[i];
            if (layer.parentField) {
                this.setNestedValue(result, layer.parentField, JSON.stringify(layer.content));
            }
        }
        
        return JSON.stringify(result, null, 2);
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
    
    getNestedValue(obj, path) {
        const keys = path.match(/[^.\[\]]+/g) || [];
        let current = obj;
        
        for (const key of keys) {
            if (current === null || current === undefined) return undefined;
            current = current[key];
        }
        
        return current;
    }
}

// Document management
function createDocument(name = null) {
    const id = 'doc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    const docName = name || `文档 ${Object.keys(documents).length + 1}`;
    
    return {
        id: id,
        name: docName,
        input: '',
        output: '',
        layers: [],
        editedLayers: {},
        activeTab: 0,
        created: Date.now(),
        modified: Date.now()
    };
}

function switchToDocument(docId) {
    if (!documents[docId]) return;
    
    // Save current document state
    if (currentDocId && documents[currentDocId]) {
        saveCurrentDocumentState();
    }
    
    // Dispose current editors
    Object.values(editors).forEach(editor => {
        if (editor && typeof editor.dispose === 'function') {
            editor.dispose();
        }
    });
    editors = {};
    
    // Switch to new document
    currentDocId = docId;
    const doc = documents[docId];
    
    // Load document state
    if (editors.input) {
        editors.input.setValue(doc.input || '');
    }
    if (editors.output) {
        editors.output.setValue(doc.output || '');
    }
    
    // Restore layers
    parsedLayers = doc.layers || [];
    if (parsedLayers.length > 0) {
        generateEditTabs();
        if (doc.activeTab !== undefined) {
            switchTab(doc.activeTab);
        }
    } else {
        document.getElementById('editTabs').innerHTML = '<div class="no-layers">点击"智能分析"解析JSON层级</div>';
        document.getElementById('editTabContents').innerHTML = '';
    }
    
    // Update UI
    renderMainTabs();
    updateLayerCount();
}

function saveCurrentDocumentState() {
    if (!currentDocId || !documents[currentDocId]) return;
    
    const doc = documents[currentDocId];
    doc.input = editors.input ? editors.input.getValue() : '';
    doc.output = editors.output ? editors.output.getValue() : '';
    doc.layers = parsedLayers;
    doc.editedLayers = {};
    
    // Save edited layer contents
    parsedLayers.forEach((layer, index) => {
        const editorKey = `layer_${index}`;
        if (editors[editorKey]) {
            doc.editedLayers[index] = editors[editorKey].getValue();
        }
    });
    
    doc.modified = Date.now();
}

function closeDocument(docId) {
    if (Object.keys(documents).length <= 1) {
        showNotification('至少需要保留一个文档', 'error');
        return;
    }
    
    delete documents[docId];
    
    if (currentDocId === docId) {
        const remainingDocs = Object.keys(documents);
        switchToDocument(remainingDocs[0]);
    }
    
    renderMainTabs();
    saveDocumentsToStorage();
}

function addNewDocument() {
    const newDoc = createDocument();
    documents[newDoc.id] = newDoc;
    switchToDocument(newDoc.id);
    saveDocumentsToStorage();
}

function renderMainTabs() {
    const tabsList = document.getElementById('mainTabsList');
    tabsList.innerHTML = '';
    
    Object.values(documents).forEach(doc => {
        const tab = document.createElement('div');
        tab.className = 'main-tab' + (doc.id === currentDocId ? ' active' : '');
        tab.innerHTML = `
            <span ondblclick="editDocumentName('${doc.id}', event)" id="docName_${doc.id}">${doc.name}</span>
            <span class="main-tab-close" onclick="closeDocument('${doc.id}'); event.stopPropagation();">×</span>
        `;
        tab.onclick = (e) => {
            if (!e.target.classList.contains('main-tab-close')) {
                switchToDocument(doc.id);
            }
        };
        tabsList.appendChild(tab);
    });
}

function editDocumentName(docId, event) {
    event.stopPropagation();
    const nameSpan = document.getElementById(`docName_${docId}`);
    const currentName = documents[docId].name;
    
    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentName;
    input.style.cssText = 'background: #0d1117; border: 1px solid #58a6ff; color: #e6edf3; padding: 2px 5px; border-radius: 3px;';
    
    input.onblur = () => {
        const newName = input.value.trim() || currentName;
        documents[docId].name = newName;
        nameSpan.textContent = newName;
        saveDocumentsToStorage();
    };
    
    input.onkeydown = (e) => {
        if (e.key === 'Enter') {
            input.blur();
        } else if (e.key === 'Escape') {
            input.value = currentName;
            input.blur();
        }
    };
    
    nameSpan.textContent = '';
    nameSpan.appendChild(input);
    input.focus();
    input.select();
}

// Storage functions
function saveDocumentsToStorage() {
    try {
        saveCurrentDocumentState();
        
        const dataToSave = {
            documents: documents,
            currentDocId: currentDocId,
            version: '2.0'
        };
        
        localStorage.setItem('superJsonEditor_docs', JSON.stringify(dataToSave));
        
        // Show save indicator
        const indicator = document.getElementById('autoSaveIndicator');
        indicator.textContent = '✓ 已自动保存';
        setTimeout(() => {
            indicator.textContent = '';
        }, 2000);
        
    } catch (e) {
        console.error('Failed to save to localStorage:', e);
        showNotification('自动保存失败', 'error');
    }
}

function loadDocumentsFromStorage() {
    try {
        const saved = localStorage.getItem('superJsonEditor_docs');
        if (!saved) return;
        
        const data = JSON.parse(saved);
        if (data.version === '2.0' && data.documents) {
            documents = data.documents;
            currentDocId = data.currentDocId || Object.keys(documents)[0];
            
            if (documents[currentDocId]) {
                switchToDocument(currentDocId);
                showNotification('已恢复上次会话', 'success');
            }
        }
    } catch (e) {
        console.error('Failed to load from localStorage:', e);
    }
}

// Editor initialization
function initializeEditors() {
    const inputContainer = document.getElementById('inputEditor');
    const outputContainer = document.getElementById('outputEditor');
    
    inputContainer.innerHTML = '';
    outputContainer.innerHTML = '';
    
    editors.input = monaco.editor.create(inputContainer, {
        value: '',
        language: 'json',
        theme: 'customDark',
        automaticLayout: true,
        minimap: { enabled: false },
        fontSize: 14,
        wordWrap: 'on',
        formatOnPaste: true,
        formatOnType: true
    });
    
    editors.output = monaco.editor.create(outputContainer, {
        value: '',
        language: 'json',
        theme: 'customDark',
        automaticLayout: true,
        minimap: { enabled: false },
        fontSize: 14,
        wordWrap: 'on',
        readOnly: true
    });
    
    // Auto-save on input change
    editors.input.onDidChangeModelContent(debounce(() => {
        if (currentDocId && documents[currentDocId]) {
            documents[currentDocId].input = editors.input.getValue();
            documents[currentDocId].modified = Date.now();
            saveDocumentsToStorage();
        }
    }, 1000));
}

// Layer analysis and generation
function analyzeJSON() {
    const inputValue = editors.input.getValue();
    if (!inputValue) {
        showNotification('请先输入JSON内容', 'error');
        return;
    }
    
    const analyzer = new JSONLayerAnalyzer();
    
    try {
        analyzer.analyze(inputValue);
        parsedLayers = analyzer.layers;
        
        if (parsedLayers.length === 0) {
            showNotification('未检测到有效的JSON层级', 'error');
            return;
        }
        
        generateEditTabs();
        updateLayerCount();
        updateStatus('inputStatus', 'active');
        updateStatus('editStatus', 'active');
        
        showNotification(`成功解析 ${parsedLayers.length} 个JSON层级`, 'success');
        
        // Save state
        if (currentDocId && documents[currentDocId]) {
            documents[currentDocId].layers = parsedLayers;
            saveDocumentsToStorage();
        }
        
    } catch (e) {
        showNotification('解析失败: ' + e.message, 'error');
        updateStatus('inputStatus', 'error');
    }
}

function generateEditTabs() {
    const tabsContainer = document.getElementById('editTabs');
    const contentsContainer = document.getElementById('editTabContents');
    
    tabsContainer.innerHTML = '';
    contentsContainer.innerHTML = '';
    
    parsedLayers.forEach((layer, index) => {
        // Create tab
        const tab = document.createElement('div');
        tab.className = 'tab' + (index === 0 ? ' active' : '');
        tab.onclick = () => switchTab(index);
        
        const parentInfo = layer.parentField ? ` (${layer.parentField})` : ' (根)';
        tab.innerHTML = `
            <span class="tab-status"></span>
            层级 ${index + 1}${parentInfo}
        `;
        tabsContainer.appendChild(tab);
        
        // Create content container
        const content = document.createElement('div');
        content.className = 'editor-content';
        content.id = `layer_content_${index}`;
        content.style.display = index === 0 ? 'block' : 'none';
        content.style.position = 'absolute';
        content.style.top = '0';
        content.style.left = '0';
        content.style.right = '0';
        content.style.bottom = '0';
        contentsContainer.appendChild(content);
    });
    
    // Initialize first tab
    if (parsedLayers.length > 0) {
        switchTab(0);
    }
}

function switchTab(index) {
    // Update tab styles
    document.querySelectorAll('.tab').forEach((tab, i) => {
        tab.classList.toggle('active', i === index);
    });
    
    // Update content visibility
    document.querySelectorAll('.editor-content').forEach((content, i) => {
        content.style.display = i === index ? 'block' : 'none';
    });
    
    // Create editor if needed
    const editorKey = `layer_${index}`;
    if (!editors[editorKey]) {
        createLayerEditor(index);
    }
    
    // Update current path
    const layer = parsedLayers[index];
    const pathElement = document.getElementById('currentPath');
    if (layer.parentField) {
        pathElement.textContent = `路径: ${layer.parentField}`;
    } else {
        pathElement.textContent = '根层级';
    }
    
    // Save active tab
    if (currentDocId && documents[currentDocId]) {
        documents[currentDocId].activeTab = index;
    }
}

function createLayerEditor(index) {
    const container = document.getElementById(`layer_content_${index}`);
    const layer = parsedLayers[index];
    const editorKey = `layer_${index}`;
    
    // Check for saved edited content
    let content = JSON.stringify(layer.content, null, 2);
    if (currentDocId && documents[currentDocId] && documents[currentDocId].editedLayers) {
        const savedContent = documents[currentDocId].editedLayers[index];
        if (savedContent) {
            content = savedContent;
        }
    }
    
    editors[editorKey] = monaco.editor.create(container, {
        value: content,
        language: 'json',
        theme: 'customDark',
        automaticLayout: true,
        minimap: { enabled: false },
        fontSize: 14,
        wordWrap: 'on',
        formatOnPaste: true,
        formatOnType: true
    });
    
    // Add change listener for bidirectional sync
    editors[editorKey].onDidChangeModelContent(debounce(() => {
        if (!isUpdating) {
            handleLayerEdit(index);
        }
    }, 300));
}

function handleLayerEdit(index) {
    const editorKey = `layer_${index}`;
    const newContent = editors[editorKey].getValue();
    
    try {
        const parsed = JSON.parse(newContent);
        parsedLayers[index].content = parsed;
        
        // Mark tab as modified
        const tab = document.querySelectorAll('.tab')[index];
        if (tab) {
            tab.classList.add('modified');
        }
        
        // Update child and parent layers
        updateChildLayers(index);
        updateParentLayers(index);
        
        // Save state
        if (currentDocId && documents[currentDocId]) {
            if (!documents[currentDocId].editedLayers) {
                documents[currentDocId].editedLayers = {};
            }
            documents[currentDocId].editedLayers[index] = newContent;
            saveDocumentsToStorage();
        }
        
        // Show sync status
        const syncStatus = document.getElementById('syncStatus');
        syncStatus.style.display = 'inline';
        setTimeout(() => {
            syncStatus.style.display = 'none';
        }, 1000);
        
    } catch (e) {
        // Invalid JSON, don't sync
    }
}

function updateChildLayers(parentIndex) {
    const parentLayer = parsedLayers[parentIndex];
    
    parsedLayers.forEach((layer, index) => {
        if (index > parentIndex && layer.parentField) {
            // Check if this layer is a child of the parent
            const parentPath = layer.parentField.split('.').slice(0, -1).join('.');
            if (parentPath === '' || layer.depth === parentLayer.depth + 1) {
                // Get the field value from parent
                const analyzer = new JSONLayerAnalyzer();
                const fieldValue = analyzer.getNestedValue(parentLayer.content, layer.parentField);
                
                if (typeof fieldValue === 'string' && analyzer.isLikelyJSON(fieldValue)) {
                    try {
                        const parsed = JSON.parse(fieldValue);
                        layer.content = parsed;
                        
                        // Update editor if it exists
                        const editorKey = `layer_${index}`;
                        if (editors[editorKey]) {
                            isUpdating = true;
                            editors[editorKey].setValue(JSON.stringify(parsed, null, 2));
                            isUpdating = false;
                        }
                    } catch (e) {
                        // Invalid JSON in field
                    }
                }
            }
        }
    });
}

function updateParentLayers(childIndex) {
    const childLayer = parsedLayers[childIndex];
    if (!childLayer.parentField) return;
    
    // Find parent layer
    const parentIndex = childIndex - 1;
    if (parentIndex >= 0) {
        const parentLayer = parsedLayers[parentIndex];
        const analyzer = new JSONLayerAnalyzer();
        
        // Update the field in parent
        const updatedContent = JSON.stringify(childLayer.content);
        analyzer.setNestedValue(parentLayer.content, childLayer.parentField, updatedContent);
        
        // Update parent editor
        const editorKey = `layer_${parentIndex}`;
        if (editors[editorKey]) {
            isUpdating = true;
            editors[editorKey].setValue(JSON.stringify(parentLayer.content, null, 2));
            isUpdating = false;
        }
        
        // Recursively update parent's parent
        if (parentIndex > 0) {
            updateParentLayers(parentIndex);
        }
    }
}

function generateOutput() {
    if (parsedLayers.length === 0) {
        showNotification('请先解析JSON', 'error');
        return;
    }
    
    try {
        const analyzer = new JSONLayerAnalyzer();
        const rebuilt = analyzer.rebuild(parsedLayers);
        
        editors.output.setValue(rebuilt);
        updateStatus('outputStatus', 'active');
        showNotification('输出生成成功', 'success');
        
        // Save output
        if (currentDocId && documents[currentDocId]) {
            documents[currentDocId].output = rebuilt;
            saveDocumentsToStorage();
        }
        
    } catch (e) {
        showNotification('生成输出失败: ' + e.message, 'error');
        updateStatus('outputStatus', 'error');
    }
}

function applyOutputToInput() {
    const outputValue = editors.output.getValue();
    if (!outputValue) {
        showNotification('输出为空', 'error');
        return;
    }
    
    editors.input.setValue(outputValue);
    showNotification('已应用到输入', 'success');
    
    // Clear layers since input changed
    parsedLayers = [];
    document.getElementById('editTabs').innerHTML = '<div class="no-layers">点击"智能分析"解析JSON层级</div>';
    document.getElementById('editTabContents').innerHTML = '';
    
    // Dispose layer editors
    Object.keys(editors).forEach(key => {
        if (key.startsWith('layer_')) {
            editors[key].dispose();
            delete editors[key];
        }
    });
    
    updateLayerCount();
}

// Utility functions
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function updateStatus(elementId, status) {
    const element = document.getElementById(elementId);
    if (element) {
        element.className = 'status-indicator ' + status;
    }
}

function updateLayerCount() {
    document.getElementById('layerCount').textContent = `层级: ${parsedLayers.length}`;
}

function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = 'show ' + type;
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey) {
        switch(e.key) {
            case 'Enter':
                e.preventDefault();
                if (currentMode === 'layer') {
                    analyzeJSON();
                }
                break;
            case 's':
                e.preventDefault();
                if (currentMode === 'layer') {
                    generateOutput();
                } else {
                    saveDocumentsToStorage();
                }
                break;
            case 't':
                e.preventDefault();
                addNewDocument();
                break;
            case 'w':
                e.preventDefault();
                if (currentDocId) {
                    closeDocument(currentDocId);
                }
                break;
            case 'Tab':
                e.preventDefault();
                const docIds = Object.keys(documents);
                const currentIndex = docIds.indexOf(currentDocId);
                const nextIndex = (currentIndex + 1) % docIds.length;
                switchToDocument(docIds[nextIndex]);
                break;
        }
    }
});

// Panel resizing
let isResizing = false;
let currentResizer = null;
let startX = 0;
let startWidth = 0;

document.querySelectorAll('.resizer').forEach(resizer => {
    resizer.addEventListener('mousedown', (e) => {
        isResizing = true;
        currentResizer = resizer;
        startX = e.clientX;
        startWidth = resizer.parentElement.offsetWidth;
        document.body.style.cursor = 'col-resize';
        e.preventDefault();
    });
});

document.addEventListener('mousemove', (e) => {
    if (!isResizing) return;
    
    const diff = e.clientX - startX;
    const newWidth = startWidth + diff;
    
    if (newWidth >= 200 && newWidth <= window.innerWidth * 0.6) {
        currentResizer.parentElement.style.width = newWidth + 'px';
    }
});

document.addEventListener('mouseup', () => {
    isResizing = false;
    currentResizer = null;
    document.body.style.cursor = 'default';
});

// Prevent accidental navigation
window.addEventListener('beforeunload', (e) => {
    if (parsedLayers.length > 0) {
        e.preventDefault();
        e.returnValue = '';
    }
});