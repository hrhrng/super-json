/**
 * Super JSON Editor - Main Application
 */

class SuperJSONApp {
    constructor() {
        this.documentManager = new DocumentManager();
        this.editorManager = new EditorManager();
        this.analyzer = null;
        this.isResizing = false;
        this.currentResizer = null;
        this.currentPanel = null;
        this.startX = 0;
        this.startWidth = 0;
    }

    init() {
        // Initialize Monaco Editor
        this.editorManager.initializeMonaco(() => {
            this.setupEditors();
            this.loadDocuments();
            this.setupEventListeners();
            this.initResizers();
        });
    }

    setupEditors() {
        // Link managers
        this.documentManager.editors = this.editorManager.editors;
        this.editorManager.documentManager = this.documentManager;
        
        // Create main editors
        const inputEditor = this.editorManager.createInputEditor(
            document.getElementById('inputEditor')
        );
        
        const outputEditor = this.editorManager.createOutputEditor(
            document.getElementById('outputEditor')
        );
        
        // Setup editor change listener
        if (inputEditor) {
            let saveTimeout = null;
            inputEditor.onDidChangeModelContent(() => {
                this.validateJSON('input');
                
                if (saveTimeout) {
                    clearTimeout(saveTimeout);
                }
                
                saveTimeout = setTimeout(() => {
                    if (this.documentManager.currentDocId) {
                        const doc = this.documentManager.documents.find(
                            d => d.id === this.documentManager.currentDocId
                        );
                        if (doc) {
                            doc.content = inputEditor.getValue();
                            this.documentManager.saveToStorage();
                        }
                    }
                }, 1000);
            });
        }
    }

    loadDocuments() {
        this.documentManager.loadFromStorage();
        this.documentManager.renderMainTabs();
        
        // Load current document content
        if (this.documentManager.currentDocId) {
            const doc = this.documentManager.documents.find(
                d => d.id === this.documentManager.currentDocId
            );
            if (doc && this.editorManager.editors.input) {
                this.editorManager.editors.input.setValue(doc.content || '');
            }
        }
    }

    analyzeJSON() {
        const input = this.editorManager.editors.input?.getValue();
        if (!input || !input.trim()) {
            this.showNotification('请输入JSON数据', 'error');
            return;
        }
        
        this.updateStatus('正在分析JSON结构...');
        const editStatus = document.getElementById('editStatus');
        if (editStatus) editStatus.classList.add('processing');
        
        try {
            this.analyzer = new JSONLayerAnalyzer(this.editorManager.config.maxDepth);
            const initialData = JSON.parse(input);
            this.documentManager.parsedLayers = this.analyzer.analyze(initialData);
            
            // Save parsed layers to current document
            if (this.documentManager.currentDocId) {
                const doc = this.documentManager.documents.find(
                    d => d.id === this.documentManager.currentDocId
                );
                if (doc) {
                    doc.parsedLayers = this.documentManager.parsedLayers;
                    this.documentManager.saveToStorage();
                }
            }
            
            // Generate edit tabs
            this.editorManager.generateEditTabs(this.documentManager.parsedLayers);
            
            // Update layer info
            this.updateLayerInfo();
            
            this.showNotification(
                `成功解析 ${this.documentManager.parsedLayers.length} 层JSON结构`, 
                'success'
            );
            this.updateStatus(`已解析 ${this.documentManager.parsedLayers.length} 层JSON`);
            
            if (editStatus) {
                editStatus.classList.remove('processing');
                editStatus.classList.remove('error');
            }
            
        } catch (e) {
            this.showNotification('JSON解析失败: ' + e.message, 'error');
            if (editStatus) editStatus.classList.add('error');
        }
    }

    generateOutput() {
        try {
            let result;
            
            if (this.documentManager.parsedLayers && this.documentManager.parsedLayers.length > 0) {
                // Update all layer data from editors
                this.documentManager.parsedLayers.forEach((layer, index) => {
                    const editor = this.editorManager.editors[`layer${index}`];
                    if (editor) {
                        try {
                            layer.data = JSON.parse(editor.getValue());
                        } catch (e) {
                            console.error(`Failed to parse layer ${index}:`, e);
                        }
                    }
                });
                
                // Rebuild from layers
                result = this.rebuildFromLayers(this.documentManager.parsedLayers);
            } else {
                // Use input editor content directly
                const inputContent = this.editorManager.editors.input?.getValue();
                result = JSON.parse(inputContent);
            }
            
            const outputString = JSON.stringify(result, null, 2);
            this.editorManager.editors.output?.setValue(outputString);
            
            this.showNotification('输出生成成功！', 'success');
            this.updateStatus('输出已生成');
        } catch (e) {
            this.showNotification('生成输出失败: ' + e.message, 'error');
        }
    }

    rebuildFromLayers(layers) {
        if (layers.length === 0) return {};
        
        // Create layer copies
        const layersCopy = layers.map(l => ({
            ...l,
            data: JSON.parse(JSON.stringify(l.data))
        }));
        
        // Build parent-child relationships
        for (let i = layersCopy.length - 1; i > 0; i--) {
            const child = layersCopy[i];
            
            for (let j = i - 1; j >= 0; j--) {
                const parent = layersCopy[j];
                
                if (child.depth === parent.depth + 1) {
                    if (child.parentField === '[parsed]') {
                        parent.data = JSON.stringify(child.data);
                    } else if (child.parentField && typeof parent.data === 'object') {
                        parent.data[child.parentField] = JSON.stringify(child.data);
                    }
                    break;
                }
            }
        }
        
        return layersCopy[0].data;
    }

    applyOutputToInput() {
        const outputValue = this.editorManager.editors.output?.getValue();
        if (!outputValue || !outputValue.trim()) {
            this.showNotification('输出为空，无法应用到输入', 'error');
            return;
        }
        
        try {
            // Validate output JSON
            JSON.parse(outputValue);
            
            // Set to input editor
            this.editorManager.editors.input?.setValue(outputValue);
            
            // Clear parsed layers
            this.documentManager.parsedLayers = [];
            this.editorManager.clearLayerEditors();
            
            // Update status
            const currentPath = document.getElementById('currentPath');
            const layerCount = document.getElementById('layerCount');
            if (currentPath) currentPath.textContent = '未解析';
            if (layerCount) layerCount.textContent = '层级: 0';
            
            this.showNotification('输出已应用到输入，请重新分析', 'success');
            this.updateStatus('输出已应用到输入');
        } catch (e) {
            this.showNotification('应用失败: ' + e.message, 'error');
        }
    }

    updateLayerInfo() {
        const layerCount = document.getElementById('layerCount');
        if (layerCount) {
            layerCount.textContent = `层级: ${this.documentManager.parsedLayers.length}`;
        }
    }

    validateJSON(editorName) {
        this.editorManager.validateJSON(editorName);
    }

    showNotification(message, type = 'info') {
        const notification = document.getElementById('notification');
        if (notification) {
            notification.textContent = message;
            notification.className = type;
            notification.style.display = 'block';
            
            setTimeout(() => {
                notification.style.display = 'none';
            }, 3000);
        }
    }

    updateStatus(message) {
        const statusText = document.getElementById('statusText');
        if (statusText) {
            statusText.textContent = message;
        }
    }

    setupEventListeners() {
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'Enter') {
                e.preventDefault();
                this.analyzeJSON();
            }
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                this.generateOutput();
            }
            if (e.ctrlKey && e.key === 't') {
                e.preventDefault();
                this.documentManager.addNewDocument();
            }
            if (e.ctrlKey && e.key === 'w') {
                e.preventDefault();
                if (this.documentManager.currentDocId) {
                    this.documentManager.closeDocument(this.documentManager.currentDocId);
                }
            }
            if (e.ctrlKey && e.key === 'Tab') {
                e.preventDefault();
                const currentIndex = this.documentManager.documents.findIndex(
                    d => d.id === this.documentManager.currentDocId
                );
                if (currentIndex !== -1 && this.documentManager.documents.length > 1) {
                    const nextIndex = (currentIndex + 1) % this.documentManager.documents.length;
                    this.documentManager.switchToDocument(
                        this.documentManager.documents[nextIndex].id
                    );
                }
            }
        });

        // Window unload
        window.addEventListener('beforeunload', () => {
            if (this.documentManager.currentDocId && this.editorManager.editors.input) {
                const doc = this.documentManager.documents.find(
                    d => d.id === this.documentManager.currentDocId
                );
                if (doc) {
                    doc.content = this.editorManager.editors.input.getValue();
                    doc.parsedLayers = this.documentManager.parsedLayers;
                    this.documentManager.saveToStorage();
                }
            }
        });
    }

    initResizers() {
        document.querySelectorAll('.resizer').forEach(resizer => {
            resizer.addEventListener('mousedown', (e) => {
                this.isResizing = true;
                this.currentResizer = e.target;
                this.currentPanel = e.target.parentElement;
                this.startX = e.clientX;
                this.startWidth = this.currentPanel.offsetWidth;
                document.body.style.cursor = 'col-resize';
                document.body.style.userSelect = 'none';
                e.preventDefault();
            });
        });

        document.addEventListener('mousemove', (e) => {
            if (!this.isResizing || !this.currentPanel) return;
            
            const diff = e.clientX - this.startX;
            const newWidth = this.startWidth + diff;
            const minWidth = 250;
            const maxWidth = window.innerWidth - 500;
            
            if (newWidth >= minWidth && newWidth <= maxWidth) {
                this.currentPanel.style.flex = 'none';
                this.currentPanel.style.width = newWidth + 'px';
                
                // Trigger Monaco layout update
                Object.keys(this.editorManager.editors).forEach(key => {
                    const editor = this.editorManager.editors[key];
                    if (editor && editor.layout) {
                        editor.layout();
                    }
                });
            }
        });

        document.addEventListener('mouseup', () => {
            if (this.isResizing) {
                this.isResizing = false;
                this.currentResizer = null;
                this.currentPanel = null;
                document.body.style.cursor = 'default';
                document.body.style.userSelect = '';
            }
        });
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new SuperJSONApp();
    
    // Set up global functions for compatibility
    window.analyzeJSON = () => app.analyzeJSON();
    window.generateOutput = () => app.generateOutput();
    window.applyOutputToInput = () => app.applyOutputToInput();
    window.addNewDocument = () => app.documentManager.addNewDocument();
    window.generateEditTabs = () => app.editorManager.generateEditTabs(app.documentManager.parsedLayers);
    window.clearLayerEditors = () => app.editorManager.clearLayerEditors();
    
    // Initialize
    app.init();
});