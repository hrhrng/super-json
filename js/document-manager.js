/**
 * Document Manager - Handles multi-document functionality
 */

class DocumentManager {
    constructor() {
        this.documents = [];
        this.currentDocId = null;
        this.documentIdCounter = 0;
        this.parsedLayers = [];
        this.editors = {};
        this.tabsCache = new Map();
    }

    createDocument(title = null, content = '') {
        const id = `doc_${this.documentIdCounter++}`;
        const doc = {
            id: id,
            title: title || `文档 ${this.documentIdCounter}`,
            content: content,
            parsedLayers: [],
            createdAt: Date.now()
        };
        this.documents.push(doc);
        this.saveToStorage();
        return doc;
    }

    addNewDocument() {
        const doc = this.createDocument();
        this.renderMainTabs();
        this.switchToDocument(doc.id);
    }

    switchToDocument(docId) {
        if (this.currentDocId === docId) return;
        
        // Save current document state
        if (this.currentDocId) {
            const currentDoc = this.documents.find(d => d.id === this.currentDocId);
            if (currentDoc && this.editors.input) {
                currentDoc.content = this.editors.input.getValue();
                currentDoc.parsedLayers = this.parsedLayers;
            }
        }
        
        // Switch to new document
        this.currentDocId = docId;
        const doc = this.documents.find(d => d.id === docId);
        if (doc) {
            // Update content
            if (this.editors.input) {
                this.editors.input.setValue(doc.content || '');
            }
            
            // Restore parsed layers
            this.parsedLayers = doc.parsedLayers || [];
            if (this.parsedLayers.length > 0) {
                window.generateEditTabs?.();
            } else {
                window.clearLayerEditors?.();
            }
            
            // Clear output
            if (this.editors.output) {
                this.editors.output.setValue('');
            }
        }
        
        this.updateTabStyles();
        
        // Async save
        requestAnimationFrame(() => {
            this.saveToStorage();
        });
    }

    updateTabStyles() {
        const tabs = document.querySelectorAll('.main-tab');
        tabs.forEach((tab, index) => {
            const doc = this.documents[index];
            if (doc) {
                tab.classList.toggle('active', doc.id === this.currentDocId);
            }
        });
    }

    closeDocument(docId) {
        const index = this.documents.findIndex(d => d.id === docId);
        if (index === -1) return;
        
        this.documents.splice(index, 1);
        
        // If closing current document, switch to another
        if (docId === this.currentDocId) {
            if (this.documents.length > 0) {
                const newDoc = this.documents[Math.min(index, this.documents.length - 1)];
                this.currentDocId = newDoc.id;
                
                // Update content
                if (this.editors.input) {
                    this.editors.input.setValue(newDoc.content || '');
                }
                this.parsedLayers = newDoc.parsedLayers || [];
                if (this.parsedLayers.length > 0) {
                    window.generateEditTabs?.();
                } else {
                    window.clearLayerEditors?.();
                }
                if (this.editors.output) {
                    this.editors.output.setValue('');
                }
            } else {
                // No documents left, create new one
                this.addNewDocument();
                return;
            }
        }
        
        this.renderMainTabs();
        this.saveToStorage();
    }

    renderMainTabs() {
        const tabsList = document.getElementById('mainTabsList');
        if (!tabsList) return;
        
        const existingTabs = tabsList.querySelectorAll('.main-tab');
        const needsFullRebuild = existingTabs.length !== this.documents.length;
        
        if (needsFullRebuild) {
            tabsList.innerHTML = '';
            this.tabsCache.clear();
            
            this.documents.forEach(doc => {
                const tab = this.createTabElement(doc);
                this.tabsCache.set(doc.id, tab);
                tabsList.appendChild(tab);
            });
        } else {
            // Only update necessary parts
            this.documents.forEach((doc, index) => {
                const tab = existingTabs[index];
                if (tab) {
                    tab.className = 'main-tab' + (doc.id === this.currentDocId ? ' active' : '');
                    const title = tab.querySelector('.main-tab-title');
                    if (title && title.textContent !== doc.title) {
                        title.textContent = doc.title;
                    }
                }
            });
        }
    }

    createTabElement(doc) {
        const tab = document.createElement('div');
        tab.className = 'main-tab' + (doc.id === this.currentDocId ? ' active' : '');
        tab.dataset.docId = doc.id;
        
        const title = document.createElement('span');
        title.className = 'main-tab-title';
        title.textContent = doc.title;
        
        // Click to switch
        title.addEventListener('click', (e) => {
            e.stopPropagation();
            if (doc.id !== this.currentDocId) {
                this.switchToDocument(doc.id);
            }
        });
        
        // Double-click to edit
        title.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            e.preventDefault();
            this.editTabTitle(doc, title);
        });
        
        const closeBtn = document.createElement('span');
        closeBtn.className = 'main-tab-close';
        closeBtn.innerHTML = '×';
        closeBtn.onclick = (e) => {
            e.stopPropagation();
            this.closeDocument(doc.id);
        };
        
        tab.appendChild(title);
        tab.appendChild(closeBtn);
        
        return tab;
    }

    editTabTitle(doc, titleElement) {
        const input = document.createElement('input');
        input.type = 'text';
        input.value = doc.title;
        input.style.cssText = 'width:100px;background:#1e1e1e;border:1px solid #007acc;color:white;padding:2px 4px;fontSize:13px;outline:none;';
        
        const finishEdit = () => {
            const newTitle = input.value.trim();
            if (newTitle) {
                doc.title = newTitle;
                this.saveToStorage();
            }
            this.renderMainTabs();
        };
        
        input.addEventListener('blur', finishEdit);
        input.addEventListener('keydown', (e) => {
            e.stopPropagation();
            if (e.key === 'Enter') {
                finishEdit();
            } else if (e.key === 'Escape') {
                this.renderMainTabs();
            }
        });
        
        titleElement.textContent = '';
        titleElement.appendChild(input);
        input.focus();
        input.select();
    }

    saveToStorage() {
        try {
            const dataToSave = {
                documents: this.documents.map(doc => ({
                    id: doc.id,
                    title: doc.title,
                    content: doc.content,
                    createdAt: doc.createdAt,
                    parsedLayers: doc.parsedLayers
                })),
                currentDocId: this.currentDocId
            };
            localStorage.setItem('superJsonDocuments', JSON.stringify(dataToSave));
            
            const savedIndicator = document.getElementById('autoSaveIndicator');
            if (savedIndicator) {
                savedIndicator.textContent = '✓ 已自动保存';
                savedIndicator.style.color = '#4ec9b0';
                setTimeout(() => {
                    savedIndicator.textContent = '';
                }, 2000);
            }
        } catch (e) {
            console.error('Failed to save documents:', e);
        }
    }

    loadFromStorage() {
        try {
            const saved = localStorage.getItem('superJsonDocuments');
            if (saved) {
                const data = JSON.parse(saved);
                this.documents = data.documents || [];
                
                // Restore document ID counter
                if (this.documents.length > 0) {
                    const maxId = Math.max(...this.documents.map(d => parseInt(d.id.split('_')[1] || 0)));
                    this.documentIdCounter = maxId + 1;
                }
                
                // Restore current document
                if (data.currentDocId && this.documents.find(d => d.id === data.currentDocId)) {
                    this.currentDocId = data.currentDocId;
                } else if (this.documents.length > 0) {
                    this.currentDocId = this.documents[0].id;
                }
            }
        } catch (e) {
            console.error('Failed to load documents:', e);
        }
        
        // If no documents, create default one
        if (this.documents.length === 0) {
            this.addNewDocument();
        }
    }
}

// Export for use
window.DocumentManager = DocumentManager;