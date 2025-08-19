/**
 * Editor Manager - Handles Monaco Editor instances and layer editing
 */

class EditorManager {
    constructor() {
        this.editors = {};
        this.isUpdating = false;
        this.currentTab = 0;
        this.config = {
            autoDetect: true,
            preserveFormat: true,
            showLineNumbers: true,
            maxDepth: 10,
            fontSize: 13,
            autoSync: true
        };
    }

    initializeMonaco(callback) {
        require.config({ 
            paths: { 
                vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.44.0/min/vs' 
            } 
        });
        
        require(['vs/editor/editor.main'], () => {
            monaco.editor.setTheme('vs-dark');
            callback();
        });
    }

    createInputEditor(container) {
        if (!container) return;
        
        this.editors.input = monaco.editor.create(container, {
            value: '',
            language: 'json',
            theme: 'vs-dark',
            automaticLayout: true,
            minimap: { enabled: false },
            fontSize: this.config.fontSize,
            wordWrap: 'on',
            formatOnPaste: true,
            formatOnType: true,
            scrollBeyondLastLine: false,
            lineNumbers: this.config.showLineNumbers ? 'on' : 'off'
        });
        
        return this.editors.input;
    }

    createOutputEditor(container) {
        if (!container) return;
        
        this.editors.output = monaco.editor.create(container, {
            value: '',
            language: 'json',
            theme: 'vs-dark',
            automaticLayout: true,
            minimap: { enabled: false },
            fontSize: this.config.fontSize,
            wordWrap: 'on',
            readOnly: true,
            scrollBeyondLastLine: false,
            lineNumbers: this.config.showLineNumbers ? 'on' : 'off'
        });
        
        return this.editors.output;
    }

    createLayerEditor(index, parsedLayers) {
        if (!parsedLayers[index] || this.editors[`layer${index}`]) return;
        
        const editorElement = document.getElementById(`editor${index}`);
        if (!editorElement) return;
        
        try {
            const jsonString = JSON.stringify(parsedLayers[index].data, null, 2);
            
            const editor = monaco.editor.create(editorElement, {
                value: '',
                language: 'json',
                theme: 'vs-dark',
                automaticLayout: true,
                minimap: { enabled: false },
                fontSize: this.config.fontSize,
                wordWrap: 'on',
                scrollBeyondLastLine: false,
                lineNumbers: this.config.showLineNumbers ? 'on' : 'off',
                folding: true,
                formatOnPaste: true,
                formatOnType: true
            });
            
            this.editors[`layer${index}`] = editor;
            
            // Set value after creation for better performance
            editor.setValue(jsonString);
            
            // Add change listener for bidirectional sync
            editor.onDidChangeModelContent(this.debounce(() => {
                this.handleLayerEdit(index, parsedLayers);
            }, 500));
            
            return editor;
        } catch (e) {
            console.error('Failed to create editor for layer', index, e);
        }
    }

    handleLayerEdit(editedIndex, parsedLayers) {
        if (this.isUpdating) return;
        
        const editor = this.editors[`layer${editedIndex}`];
        if (!editor) return;
        
        try {
            const newData = JSON.parse(editor.getValue());
            parsedLayers[editedIndex].data = newData;
            
            this.isUpdating = true;
            
            // Update child layers if this is a parent
            if (editedIndex < parsedLayers.length - 1) {
                this.updateChildLayers(editedIndex, parsedLayers);
            }
            
            // Update parent layers if this is a child
            if (editedIndex > 0) {
                this.updateParentLayers(editedIndex, parsedLayers);
            }
            
            setTimeout(() => {
                this.isUpdating = false;
            }, 100);
            
            document.getElementById('editStatus')?.classList.remove('error');
        } catch (e) {
            document.getElementById('editStatus')?.classList.add('error');
        }
    }

    updateChildLayers(parentIndex, parsedLayers) {
        const parentLayer = parsedLayers[parentIndex];
        
        // Re-analyze parent data for updated children
        const analyzer = new JSONLayerAnalyzer(this.config.maxDepth);
        const newLayers = analyzer.analyze(parentLayer.data);
        
        // Update relevant child layers
        for (let i = parentIndex + 1; i < parsedLayers.length; i++) {
            const childLayer = parsedLayers[i];
            
            if (childLayer.depth === parentLayer.depth + 1) {
                const matchingNewLayer = newLayers.find(nl => 
                    nl.depth === childLayer.depth && 
                    nl.parentField === childLayer.parentField
                );
                
                if (matchingNewLayer) {
                    childLayer.data = matchingNewLayer.data;
                    
                    const childEditor = this.editors[`layer${i}`];
                    if (childEditor) {
                        const currentValue = childEditor.getValue();
                        const newValue = JSON.stringify(childLayer.data, null, 2);
                        
                        if (currentValue !== newValue) {
                            const position = childEditor.getPosition();
                            const selection = childEditor.getSelection();
                            
                            childEditor.setValue(newValue);
                            
                            if (position) childEditor.setPosition(position);
                            if (selection && !selection.isEmpty()) childEditor.setSelection(selection);
                        }
                    }
                }
            } else if (childLayer.depth <= parentLayer.depth) {
                break;
            }
        }
    }

    updateParentLayers(childIndex, parsedLayers) {
        const childLayer = parsedLayers[childIndex];
        
        for (let i = childIndex - 1; i >= 0; i--) {
            const parentLayer = parsedLayers[i];
            
            if (parentLayer.depth === childLayer.depth - 1) {
                if (childLayer.parentField === '[parsed]') {
                    parentLayer.data = JSON.stringify(childLayer.data);
                } else if (childLayer.parentField && typeof parentLayer.data === 'object') {
                    parentLayer.data[childLayer.parentField] = JSON.stringify(childLayer.data);
                }
                
                const parentEditor = this.editors[`layer${i}`];
                if (parentEditor) {
                    const currentValue = parentEditor.getValue();
                    const newValue = JSON.stringify(parentLayer.data, null, 2);
                    
                    if (currentValue !== newValue) {
                        const position = parentEditor.getPosition();
                        const selection = parentEditor.getSelection();
                        
                        parentEditor.setValue(newValue);
                        
                        if (position) parentEditor.setPosition(position);
                        if (selection && !selection.isEmpty()) parentEditor.setSelection(selection);
                    }
                }
                
                if (i > 0) {
                    this.updateParentLayers(i, parsedLayers);
                }
                
                break;
            }
        }
    }

    clearLayerEditors() {
        const layerEditorKeys = Object.keys(this.editors).filter(key => key.startsWith('layer'));
        
        if (layerEditorKeys.length === 0) return;
        
        // Batch dispose
        layerEditorKeys.forEach(key => {
            if (this.editors[key] && this.editors[key].dispose) {
                this.editors[key].dispose();
            }
            delete this.editors[key];
        });
        
        // Clear DOM
        const tabsContainer = document.getElementById('editTabs');
        const contentsContainer = document.getElementById('editTabContents');
        if (tabsContainer) tabsContainer.innerHTML = '';
        if (contentsContainer) contentsContainer.innerHTML = '';
        
        const currentPath = document.getElementById('currentPath');
        const layerCount = document.getElementById('layerCount');
        if (currentPath) currentPath.textContent = '未解析';
        if (layerCount) layerCount.textContent = '层级: 0';
    }

    generateEditTabs(parsedLayers) {
        const tabsContainer = document.getElementById('editTabs');
        const contentsContainer = document.getElementById('editTabContents');
        
        if (!tabsContainer || !contentsContainer) return;
        
        // Clear old editors
        this.clearLayerEditors();
        
        if (parsedLayers.length === 0) return;
        
        // Create tabs and content areas
        parsedLayers.forEach((layer, index) => {
            // Create tab
            const tab = document.createElement('button');
            tab.className = 'tab' + (index === 0 ? ' active' : '');
            tab.innerHTML = `
                层级 ${layer.depth}
                <span class="level-badge">${layer.path.split(' > ').pop()}</span>
            `;
            tab.onclick = () => this.switchTab(index, parsedLayers);
            tabsContainer.appendChild(tab);
            
            // Create content area
            const content = document.createElement('div');
            content.className = 'tab-content' + (index === 0 ? ' active' : '');
            content.id = `tabContent${index}`;
            
            const editorDiv = document.createElement('div');
            editorDiv.style.width = '100%';
            editorDiv.style.height = '100%';
            editorDiv.id = `editor${index}`;
            content.appendChild(editorDiv);
            contentsContainer.appendChild(content);
        });
        
        // Create first editor immediately
        if (parsedLayers.length > 0) {
            Promise.resolve().then(() => {
                this.createLayerEditor(0, parsedLayers);
            });
        }
    }

    switchTab(index, parsedLayers) {
        this.currentTab = index;
        
        // Update tab styles
        document.querySelectorAll('.tab').forEach((tab, i) => {
            tab.classList.toggle('active', i === index);
        });
        
        document.querySelectorAll('.tab-content').forEach((content, i) => {
            content.classList.toggle('active', i === index);
        });
        
        // Create editor if needed (lazy loading)
        if (!this.editors[`layer${index}`]) {
            requestAnimationFrame(() => {
                this.createLayerEditor(index, parsedLayers);
            });
        }
        
        // Update path display
        const currentPath = document.getElementById('currentPath');
        if (currentPath && parsedLayers[index]) {
            currentPath.textContent = parsedLayers[index].path;
        }
    }

    validateJSON(editorName) {
        const editor = this.editors[editorName];
        const statusEl = document.getElementById(editorName + 'Status');
        
        if (!editor || !statusEl) return;
        
        try {
            const value = editor.getValue();
            if (value) {
                JSON.parse(value);
                statusEl.classList.remove('error');
            }
        } catch (e) {
            statusEl.classList.add('error');
        }
    }

    debounce(func, wait) {
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

    dispose() {
        Object.keys(this.editors).forEach(key => {
            if (this.editors[key] && this.editors[key].dispose) {
                this.editors[key].dispose();
            }
        });
        this.editors = {};
    }
}

// Export for use
window.EditorManager = EditorManager;