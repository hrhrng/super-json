import { useEffect, useState, useRef } from 'react'
import Editor, { DiffEditor, loader } from '@monaco-editor/react'
import { useDocumentStore } from '@stores/documentStore'
import { useAppStore } from '@stores/appStore'
import { JSONLayerAnalyzer } from '@utils/jsonAnalyzer'
import { Breadcrumb } from '@components/Breadcrumb/Breadcrumb'
import { showNotification, useNotification } from '@components/Notification/Notification'
import { useSimpleImport } from '@hooks/useSimpleImport'
import { createShareUrl, copyToClipboard } from '@utils/simpleShare'
const iconImg = '/super-json/icon.png'

const analyzer = new JSONLayerAnalyzer()

// Configure Monaco theme
loader.init().then(monaco => {
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
  })
})

export function MainLayout() {
  const { 
    documents,
    currentDocId,
    createDocument,
    deleteDocument,
    switchDocument,
    updateInputContent,
    updateLayers,
    updateLayer,
    updateDocumentTitle,
    updateHeroUrl,
    reorderDocuments,
    loadFromLocalStorage,
    getCurrentDocument
  } = useDocumentStore()
  
  const { viewMode, setViewMode, loadSettings } = useAppStore()
  const [processorOutput, setProcessorOutput] = useState('')
  const [activeLayerIndex, setActiveLayerIndex] = useState(0)
  const [editingDocId, setEditingDocId] = useState<string | null>(null)
  
  const { showNotification: showNotificationHook } = useNotification()
  const [editTitle, setEditTitle] = useState('')
  const [showDocSelector, setShowDocSelector] = useState(false)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [compareDocId, setCompareDocId] = useState<string | null>(null)
  const [showOnlyDifferences, setShowOnlyDifferences] = useState(true)
  const [sharingDoc, setSharingDoc] = useState(false)
  const [showPasteButton, setShowPasteButton] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  
  const currentDoc = getCurrentDocument()

  useEffect(() => {
    loadSettings()
    loadFromLocalStorage()
  }, [])
  
  // Handle imports from URL after documents are loaded
  useSimpleImport()

  // Reset active layer when document changes
  useEffect(() => {
    setActiveLayerIndex(0)
  }, [currentDocId])

  // Focus input when editing doc title
  useEffect(() => {
    if (editingDocId && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editingDocId])

  // Close document selector when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (showDocSelector && !target.closest('.doc-selector-dropdown') && !target.closest('.layer-action-btn')) {
        setShowDocSelector(false)
      }
    }
    
    if (showDocSelector) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [showDocSelector])

  const handleShare = async () => {
    if (!currentDoc) return
    
    setSharingDoc(true)
    
    try {
      const result = createShareUrl(currentDoc.inputContent)
      await copyToClipboard(result.url)
      
      showNotificationHook({
        type: 'success',
        message: `Share link copied! (${result.length} chars)`
      })
    } catch (error) {
      showNotificationHook({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to create share link'
      })
    } finally {
      setSharingDoc(false)
    }
  }

  const handleCopyJson = async () => {
    if (!currentDoc) return
    
    try {
      await copyToClipboard(currentDoc.inputContent)
      showNotificationHook({
        type: 'success',
        message: 'JSON content copied!'
      })
    } catch (error) {
      showNotificationHook({
        type: 'error',
        message: 'Failed to copy JSON'
      })
    }
  }

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText()
      
      // Create new document first
      const newDocId = createDocument()
      
      // Try to validate it's JSON
      try {
        JSON.parse(text)
        updateInputContent(newDocId, text)
        showNotificationHook({
          type: 'success',
          message: 'JSON content pasted to new document!'
        })
      } catch {
        // If not valid JSON, still paste it
        updateInputContent(newDocId, text)
        showNotificationHook({
          type: 'info',
          message: 'Content pasted to new document (not valid JSON)'
        })
      }
    } catch (error) {
      showNotificationHook({
        type: 'error',
        message: 'Failed to paste from clipboard'
      })
    }
  }

  const handleAnalyze = () => {
    if (!currentDoc) return
    
    // Check if input is empty or only whitespace
    const input = currentDoc.inputContent.trim()
    if (!input) {
      showNotification('请输入JSON内容', 'error')
      return
    }
    
    try {
      const layers = analyzer.analyze(currentDoc.inputContent)
      
      // Check if the first layer is a raw string (not valid JSON)
      if (layers.length === 1 && 
          layers[0].depth === 0 && 
          layers[0].type === 'string' && 
          typeof layers[0].content === 'string') {
        showNotification('JSON格式错误，请检查输入', 'error')
        return
      }
      
      if (layers.length === 0) {
        showNotification('未检测到有效的JSON结构', 'error')
        return
      }
      
      updateLayers(currentDoc.id, layers)
      setActiveLayerIndex(0)
      showNotification(`成功解析 ${layers.length} 个JSON层级`, 'success')
    } catch (error) {
      showNotification('JSON格式错误，请检查输入', 'error')
    }
  }

  const handleGenerate = () => {
    if (!currentDoc || currentDoc.layers.length === 0) return
    try {
      const output = analyzer.rebuild(currentDoc.layers)
      // Update input directly instead of output
      updateInputContent(currentDoc.id, output)
      showNotification('应用成功', 'success')
    } catch (error) {
      showNotification('应用失败', 'error')
    }
  }

  const [isUpdating, setIsUpdating] = useState(false)
  const [editorValues, setEditorValues] = useState<Record<number, string>>({})

  // Store editor values to maintain them during sync
  useEffect(() => {
    if (currentDoc && currentDoc.layers[activeLayerIndex]) {
      const content = currentDoc.layers[activeLayerIndex].content
      const value = typeof content === 'string' ? content : JSON.stringify(content, null, 2)
      setEditorValues(prev => ({ ...prev, [activeLayerIndex]: value }))
    }
  }, [activeLayerIndex, currentDoc])

  const handleLayerChange = (value: string | undefined) => {
    if (!currentDoc || value === undefined || isUpdating) return
    
    // Store the value
    setEditorValues(prev => ({ ...prev, [activeLayerIndex]: value }))
    
    try {
      const parsed = JSON.parse(value)
      // Create a deep clone of all layers
      const newLayers = currentDoc.layers.map(l => ({
        ...l,
        content: typeof l.content === 'object' ? JSON.parse(JSON.stringify(l.content)) : l.content
      }))
      
      // Update the changed layer
      newLayers[activeLayerIndex].content = parsed
      
      // Trigger bidirectional sync
      syncLayers(newLayers, activeLayerIndex)
    } catch (error) {
      // If JSON is invalid, still save the raw string
      updateLayer(currentDoc.id, activeLayerIndex, value)
    }
  }

  const updateChildLayers = (layers: any[], parentIndex: number, visited: Set<number> = new Set()) => {
    // Prevent infinite loops
    if (visited.has(parentIndex)) return
    visited.add(parentIndex)
    
    const parentLayer = layers[parentIndex]
    if (!parentLayer) return
    
    // Find all direct children
    layers.forEach((layer, index) => {
      if (layer.parentIndex === parentIndex && layer.parentField) {
        // Get the value from parent using the field path
        const keys = layer.parentField.match(/[^.\[\]]+/g) || []
        let fieldValue = parentLayer.content
        
        for (const key of keys) {
          if (fieldValue && typeof fieldValue === 'object') {
            fieldValue = fieldValue[key]
          }
        }
        
        // If it's an escaped JSON string, parse it
        if (typeof fieldValue === 'string') {
          try {
            const parsed = JSON.parse(fieldValue)
            layers[index].content = parsed
            
            // Update editor value for this layer if it's not the active one
            if (index !== activeLayerIndex) {
              setEditorValues(prev => ({ 
                ...prev, 
                [index]: JSON.stringify(parsed, null, 2) 
              }))
            }
            
            // Recursively update children of this child
            updateChildLayers(layers, index, visited)
          } catch {
            // Invalid JSON, keep original
          }
        }
      }
    })
  }

  const updateParentLayers = (layers: any[], childIndex: number, visited: Set<number> = new Set()) => {
    // Prevent infinite loops
    if (visited.has(childIndex)) return
    visited.add(childIndex)
    
    const childLayer = layers[childIndex]
    if (!childLayer) return
    
    if (childLayer.parentIndex !== undefined && childLayer.parentIndex >= 0 && childLayer.parentField) {
      const parentLayer = layers[childLayer.parentIndex]
      if (!parentLayer) return
      
      // Clone parent content to avoid mutation
      const parentContent = typeof parentLayer.content === 'object' 
        ? JSON.parse(JSON.stringify(parentLayer.content))
        : parentLayer.content
      
      // Convert child content to JSON string
      const updatedContent = JSON.stringify(childLayer.content)
      
      // Update parent's field
      const keys = childLayer.parentField.match(/[^.\[\]]+/g) || []
      let current = parentContent
      
      // Navigate to the parent field
      for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i]
        if (typeof current === 'object' && current !== null) {
          if (!(key in current)) {
            // Determine if next key is array index
            const nextKey = keys[i + 1]
            current[key] = /^\d+$/.test(nextKey) ? [] : {}
          }
          current = current[key]
        }
      }
      
      // Set the value
      if (current && typeof current === 'object' && keys.length > 0) {
        current[keys[keys.length - 1]] = updatedContent
      }
      
      // Update the parent layer
      layers[childLayer.parentIndex].content = parentContent
      
      // Update editor value for parent if it's not the active one
      if (childLayer.parentIndex !== activeLayerIndex) {
        setEditorValues(prev => ({ 
          ...prev, 
          [childLayer.parentIndex]: JSON.stringify(parentContent, null, 2) 
        }))
      }
      
      // Recursively update parent's parent
      updateParentLayers(layers, childLayer.parentIndex, visited)
    }
  }

  const syncLayers = (layers: any[], changedIndex: number) => {
    setIsUpdating(true)
    
    // Update all child layers recursively
    updateChildLayers(layers, changedIndex)
    
    // Update all parent layers recursively
    updateParentLayers(layers, changedIndex)
    
    // Save all changes
    if (currentDoc) {
      updateLayers(currentDoc.id, layers)
      
      // Give Monaco time to update
      setTimeout(() => {
        setIsUpdating(false)
      }, 100)
    }
  }

  // Layer actions
  const handleSaveLayerAsDoc = () => {
    if (!currentDoc || !currentDoc.layers[activeLayerIndex]) return
    
    const currentLayer = currentDoc.layers[activeLayerIndex]
    const layerContent = typeof currentLayer.content === 'string' 
      ? currentLayer.content 
      : JSON.stringify(currentLayer.content, null, 2)
    
    // Create new document with current layer content
    const newDocId = createDocument()
    updateInputContent(newDocId, layerContent)
    switchDocument(newDocId)
    showNotification('Layer saved as new document', 'success')
  }

  const handleReplaceFromDoc = () => {
    if (!currentDoc || !currentDoc.layers[activeLayerIndex]) return
    
    const otherDocs = documents.filter(d => d.id !== currentDoc.id)
    if (otherDocs.length === 0) {
      showNotification('No other documents available', 'error')
      return
    }
    
    // Show document selector
    setShowDocSelector(true)
  }
  
  const handleSelectDocForReplace = (sourceDoc: any) => {
    if (!currentDoc || !currentDoc.layers[activeLayerIndex]) return
    
    const newContent = sourceDoc.inputContent
    
    // Try to parse as JSON, if it fails, use as string
    let parsedContent: any
    try {
      parsedContent = JSON.parse(newContent)
    } catch {
      // If not valid JSON, use as string
      parsedContent = newContent
    }
    
    // Directly update the layer content
    updateLayer(currentDoc.id, activeLayerIndex, parsedContent)
    
    showNotification(`Replaced from "${sourceDoc.title}"`, 'success')
    setShowDocSelector(false)
  }

  // Processor Tools
  const formatJSON = () => {
    if (!currentDoc?.inputContent) return
    try {
      const parsed = JSON.parse(currentDoc.inputContent)
      const formatted = JSON.stringify(parsed, null, 2)
      setProcessorOutput(formatted)
      showNotification('格式化成功', 'success')
    } catch {
      showNotification('JSON格式错误', 'error')
    }
  }

  const minifyJSON = () => {
    if (!currentDoc?.inputContent) return
    try {
      const parsed = JSON.parse(currentDoc.inputContent)
      const minified = JSON.stringify(parsed)
      setProcessorOutput(minified)
      showNotification('压缩成功', 'success')
    } catch {
      showNotification('JSON格式错误', 'error')
    }
  }

  const escapeJSON = () => {
    if (!currentDoc?.inputContent) return
    try {
      const escaped = JSON.stringify(currentDoc.inputContent)
      setProcessorOutput(escaped)
      showNotification('转义成功', 'success')
    } catch {
      showNotification('转义失败', 'error')
    }
  }

  const unescapeJSON = () => {
    if (!currentDoc?.inputContent) return
    try {
      const unescaped = JSON.parse(currentDoc.inputContent)
      if (typeof unescaped === 'string') {
        setProcessorOutput(unescaped)
        showNotification('去转义成功', 'success')
      } else {
        setProcessorOutput(JSON.stringify(unescaped, null, 2))
        showNotification('去转义成功', 'success')
      }
    } catch {
      showNotification('去转义失败', 'error')
    }
  }

  const applyToInput = () => {
    if (!processorOutput || !currentDoc) return
    updateInputContent(currentDoc.id, processorOutput)
    showNotification('已应用到输入', 'success')
  }

  const base64Encode = () => {
    if (!currentDoc?.inputContent) return
    try {
      const encoded = btoa(unescape(encodeURIComponent(currentDoc.inputContent)))
      setProcessorOutput(encoded)
      showNotification('Base64 编码成功', 'success')
    } catch {
      showNotification('编码失败', 'error')
    }
  }

  const base64Decode = () => {
    if (!currentDoc?.inputContent) return
    try {
      const decoded = decodeURIComponent(escape(atob(currentDoc.inputContent)))
      setProcessorOutput(decoded)
      showNotification('Base64 解码成功', 'success')
    } catch {
      showNotification('解码失败', 'error')
    }
  }

  const urlEncode = () => {
    if (!currentDoc?.inputContent) return
    const encoded = encodeURIComponent(currentDoc.inputContent)
    setProcessorOutput(encoded)
    showNotification('URL 编码成功', 'success')
  }

  const urlDecode = () => {
    if (!currentDoc?.inputContent) return
    try {
      const decoded = decodeURIComponent(currentDoc.inputContent)
      setProcessorOutput(decoded)
      showNotification('URL 解码成功', 'success')
    } catch {
      showNotification('解码失败', 'error')
    }
  }

  const sortKeys = () => {
    if (!currentDoc?.inputContent) return
    try {
      const parsed = JSON.parse(currentDoc.inputContent)
      // Recursive function to sort object keys
      const sortObject = (obj: any): any => {
        if (Array.isArray(obj)) {
          return obj.map(sortObject)
        } else if (obj !== null && typeof obj === 'object') {
          return Object.keys(obj).sort().reduce((result: any, key) => {
            result[key] = sortObject(obj[key])
            return result
          }, {})
        }
        return obj
      }
      const sorted = JSON.stringify(sortObject(parsed), null, 2)
      setProcessorOutput(sorted)
      showNotification('键排序成功', 'success')
    } catch {
      showNotification('JSON格式错误', 'error')
    }
  }

  const copyOutput = () => {
    navigator.clipboard.writeText(processorOutput)
    showNotification('已复制到剪贴板', 'success')
  }

  // Hero Mode Functions
  const loadIntoHero = async () => {
    if (!currentDoc?.inputContent) return
    try {
      const parsed = JSON.parse(currentDoc.inputContent)
      
      // Create document via JSON Hero API
      const response = await fetch('https://jsonhero.io/api/create.json', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: currentDoc.title || 'JSON Document',
          content: parsed,
          readOnly: false,
          ttl: 86400 // 24 hours
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        if (currentDoc) {
          updateHeroUrl(currentDoc.id, data.location)
        }
        showNotification('加载到 Hero 视图', 'success')
      } else {
        showNotification('加载失败', 'error')
      }
    } catch (error) {
      showNotification('JSON格式错误或网络错误', 'error')
    }
  }

  const openHeroInNewTab = async () => {
    if (!currentDoc?.inputContent) return
    try {
      const parsed = JSON.parse(currentDoc.inputContent)
      
      // Create document via JSON Hero API
      const response = await fetch('https://jsonhero.io/api/create.json', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: currentDoc.title || 'JSON Document',
          content: parsed,
          readOnly: false,
          ttl: 86400 // 24 hours
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        window.open(data.location, '_blank')
        showNotification('在新标签页打开', 'success')
      } else {
        showNotification('加载失败', 'error')
      }
    } catch (error) {
      showNotification('JSON格式错误或网络错误', 'error')
    }
  }

  const renderContent = () => {
    switch(viewMode) {
      case 'processor':
        return (
          <div className="content" id="processorMode" style={{ display: 'flex' }}>
            <div className="panel" style={{ flex: 1 }}>
              <div className="panel-header">
                INPUT
                <span className="panel-info">JSON</span>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
                  <button
                    className="tool-btn"
                    onClick={handleShare}
                    disabled={sharingDoc}
                    title="Copy share link"
                  >
                    {sharingDoc ? '⏳' : 'Share'}
                  </button>
                  <button
                    className="tool-btn"
                    onClick={handleCopyJson}
                    title="Copy JSON content"
                  >
                    Copy
                  </button>
                </div>
              </div>
              <div className="editor-container">
                {currentDoc && (
                  <Editor
                    height="100%"
                    defaultLanguage="json"
                    theme="superJSON"
                    value={currentDoc.inputContent}
                    onChange={(value) => {
                      if (value !== undefined && currentDoc) {
                        updateInputContent(currentDoc.id, value)
                      }
                    }}
                    options={{
                      fontSize: 13,
                      minimap: { enabled: false },
                      wordWrap: 'on',
                      lineNumbers: 'on',
                      scrollBeyondLastLine: false,
                      automaticLayout: true,
                      formatOnPaste: true,
                      formatOnType: true,
                      folding: true,
                      tabSize: 2,
                      fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei UI', 'Microsoft YaHei', 'Source Han Sans SC', monospace",
                      maxTokenizationLineLength: 100000,
                    }}
                  />
                )}
              </div>
            </div>
            
            <div className="panel" style={{ flex: 1 }}>
              <div className="panel-header">
                OUTPUT
                <span className="panel-info">Result</span>
              </div>
              <div className="processor-tools">
                <button className="tool-btn" onClick={formatJSON}>Format</button>
                <button className="tool-btn" onClick={minifyJSON}>Minify</button>
                <button className="tool-btn" onClick={escapeJSON}>Escape</button>
                <button className="tool-btn" onClick={unescapeJSON}>Unescape</button>
                <button className="tool-btn" onClick={base64Encode}>Base64 Encode</button>
                <button className="tool-btn" onClick={base64Decode}>Base64 Decode</button>
                <button className="tool-btn" onClick={urlEncode}>URL Encode</button>
                <button className="tool-btn" onClick={urlDecode}>URL Decode</button>
                <button className="tool-btn" onClick={sortKeys}>Sort Keys</button>
              </div>
              <div className="editor-container">
                <Editor
                  height="100%"
                  defaultLanguage="json"
                  theme="superJSON"
                  value={processorOutput}
                  options={{
                    fontSize: 13,
                    minimap: { enabled: false },
                    wordWrap: 'on',
                    lineNumbers: 'on',
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    readOnly: true,
                    folding: true,
                    tabSize: 2,
                    fontFamily: 'JetBrains Mono, monospace',
                  }}
                />
              </div>
            </div>
          </div>
        )
        
      case 'diff':
        const otherDocs = documents.filter(d => d.id !== currentDocId)
        const compareDoc = compareDocId ? documents.find(d => d.id === compareDocId) : null
        
        // Format JSON for better comparison
        const formatJson = (content: string) => {
          try {
            const parsed = JSON.parse(content)
            return JSON.stringify(parsed, null, 2)
          } catch {
            return content
          }
        }
        
        return (
          <div className="content" id="diffMode" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="panel-header" style={{
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              padding: '0 20px',
              height: '35px',
              borderBottom: '1px solid var(--border)'
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '11px', fontWeight: '600' }}>
                  DIFF
                </span>
                <span className="panel-info" style={{ fontSize: '11px' }}>
                  {currentDoc?.title}
                </span>
                <span style={{ color: 'var(--text-dim)', fontSize: '11px' }}>vs</span>
                <select
                  value={compareDocId || ''}
                  onChange={(e) => setCompareDocId(e.target.value || null)}
                  style={{
                    background: 'var(--bg-panel)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-secondary)',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontFamily: 'JetBrains Mono, monospace',
                    cursor: 'pointer',
                    minWidth: '150px'
                  }}
                >
                  <option value="">Select document...</option>
                  {otherDocs.map(doc => (
                    <option key={doc.id} value={doc.id}>{doc.title}</option>
                  ))}
                </select>
              </span>
              
              {compareDoc && (
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '11px',
                    color: 'var(--text-dim)',
                    cursor: 'pointer'
                  }}>
                    <input
                      type="checkbox"
                      checked={showOnlyDifferences}
                      onChange={(e) => setShowOnlyDifferences(e.target.checked)}
                      style={{
                        cursor: 'pointer'
                      }}
                    />
                    Show only differences
                  </label>
                </div>
              )}
            </div>
            
            <div style={{ flex: 1, overflow: 'hidden' }}>
              {compareDoc && currentDoc ? (
                <DiffEditor
                  height="100%"
                  language="json"
                  theme="superJSON"
                  originalModelPath={`original-${currentDoc.id}.json`}
                  modifiedModelPath={`modified-${compareDoc.id}.json`}
                  original={formatJson(currentDoc.inputContent)}
                  modified={formatJson(compareDoc.inputContent)}
                  options={{
                    fontSize: 13,
                    minimap: { enabled: false },
                    wordWrap: 'on',
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    readOnly: false,
                    renderSideBySide: true,
                    renderIndicators: true,
                    originalEditable: true,  // Left side editable
                    ignoreTrimWhitespace: false,
                    renderOverviewRuler: true,
                    enableSplitViewResizing: true,
                    renderLineHighlight: 'all',
                    fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei UI', 'Microsoft YaHei', 'Source Han Sans SC', monospace",
                    diffWordWrap: 'on',
                    diffAlgorithm: 'advanced',
                    renderWhitespace: 'none',
                    hideUnchangedRegions: {
                      enabled: showOnlyDifferences,
                      revealLineCount: 3,
                      minimumLineCount: 3,
                      contextLineCount: 3
                    }
                  }}
                  onMount={(diffEditor) => {
                    const originalEditor = diffEditor.getOriginalEditor()
                    
                    // Ensure the editor has proper undo/redo stack
                    originalEditor.pushUndoStop()
                    
                    // Focus the original editor for shortcuts to work
                    originalEditor.focus()
                    
                    // Handle changes to the original (left) side without losing cursor position
                    let isInternalUpdate = false
                    originalEditor.onDidChangeModelContent(() => {
                      if (isInternalUpdate) return
                      
                      const newContent = originalEditor.getValue()
                      if (currentDoc) {
                        // Update the store without triggering re-render
                        updateInputContent(currentDoc.id, newContent)
                      }
                    })
                  }}
                />
              ) : (
                // Show current document on left, empty on right when no comparison selected
                <div style={{ display: 'flex', height: '100%' }}>
                  <div style={{ flex: 1, borderRight: '1px solid var(--border)' }}>
                    {currentDoc && (
                      <Editor
                        height="100%"
                        defaultLanguage="json"
                        theme="superJSON"
                        key={`standalone-${currentDoc.id}`}
                        defaultValue={formatJson(currentDoc.inputContent)}
                        onChange={(value) => {
                          if (value !== undefined && currentDoc) {
                            updateInputContent(currentDoc.id, value)
                          }
                        }}
                        onMount={(editor) => {
                          // Set initial value
                          editor.setValue(formatJson(currentDoc.inputContent))
                          
                          // Ensure editor has focus for shortcuts to work
                          editor.focus()
                          
                          // Make sure undo/redo stack is maintained
                          editor.pushUndoStop()
                        }}
                        options={{
                          fontSize: 13,
                          minimap: { enabled: false },
                          wordWrap: 'on',
                          lineNumbers: 'on',
                          scrollBeyondLastLine: false,
                          automaticLayout: true,
                          readOnly: false,
                          formatOnPaste: true,
                          formatOnType: true,
                          folding: true,
                          tabSize: 2,
                          fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei UI', 'Microsoft YaHei', 'Source Han Sans SC', monospace",
                          // Ensure shortcuts work
                          contextmenu: true,
                          suggestOnTriggerCharacters: true,
                        }}
                      />
                    )}
                  </div>
                  <div style={{ 
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--text-dim)',
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: '12px'
                  }}>
                    Select a document to compare
                  </div>
                </div>
              )}
            </div>
          </div>
        )
        
      case 'hero':
        return (
          <div className="content" id="heroMode">
            <div className="panel" style={{ flex: 0.4, minWidth: 350 }}>
              <div className="panel-header">
                JSON INPUT
                <button 
                  onClick={loadIntoHero}
                  style={{
                    marginLeft: 'auto',
                    background: 'transparent',
                    border: '1px solid var(--border)',
                    color: 'var(--text-secondary)',
                    padding: '3px 10px',
                    borderRadius: '2px',
                    cursor: 'pointer',
                    fontSize: '10px',
                    fontFamily: 'JetBrains Mono, monospace',
                    textTransform: 'uppercase'
                  }}
                >
                  Load → Hero
                </button>
                <button 
                  onClick={openHeroInNewTab}
                  style={{
                    marginLeft: '5px',
                    background: 'transparent',
                    border: '1px solid var(--border)',
                    color: 'var(--text-dim)',
                    padding: '3px 10px',
                    borderRadius: '2px',
                    cursor: 'pointer',
                    fontSize: '10px',
                    fontFamily: 'JetBrains Mono, monospace'
                  }}
                  title="Open in new tab"
                >
                  ↗
                </button>
              </div>
              <div className="editor-container">
                {currentDoc && (
                  <Editor
                    height="100%"
                    defaultLanguage="json"
                    theme="superJSON"
                    value={currentDoc.inputContent}
                    onChange={(value) => {
                      if (value !== undefined && currentDoc) {
                        updateInputContent(currentDoc.id, value)
                      }
                    }}
                    options={{
                      fontSize: 13,
                      minimap: { enabled: false },
                      wordWrap: 'on',
                      lineNumbers: 'on',
                      scrollBeyondLastLine: false,
                      automaticLayout: true,
                      formatOnPaste: true,
                      formatOnType: true,
                      folding: true,
                      tabSize: 2,
                      fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei UI', 'Microsoft YaHei', 'Source Han Sans SC', monospace",
                      maxTokenizationLineLength: 100000,
                    }}
                  />
                )}
              </div>
            </div>
            <div className="panel" style={{ flex: 1 }}>
              <div className="panel-header">
                JSON HERO VIEWER
                <span className="panel-info">Interactive</span>
              </div>
              <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
                {currentDoc?.heroUrl ? (
                  <iframe 
                    src={currentDoc.heroUrl}
                    style={{ width: '100%', height: '100%', border: 'none', background: '#000' }}
                  />
                ) : (
                  <div style={{ 
                    width: '100%', 
                    height: '100%', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    color: 'var(--text-dim)', 
                    fontFamily: 'JetBrains Mono, monospace' 
                  }}>
                    <div style={{ textAlign: 'center' }}>
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" style={{ opacity: 0.3, marginBottom: 10 }}>
                        <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"/>
                      </svg>
                      <div>JSON HERO VIEWER</div>
                      <div style={{ fontSize: 10, marginTop: 10, opacity: 0.5 }}>Enter JSON and click "Load → Hero"</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
        
      default: // layer mode
        return (
          <div className="content" id="layerMode" style={{ position: 'relative' }}>
            <div className="panel panel-input">
              <div className="panel-header">
                INPUT
                <span className="panel-info">JSON</span>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
                  <button
                    className="tool-btn"
                    onClick={handleShare}
                    disabled={sharingDoc}
                    title="Copy share link"
                  >
                    {sharingDoc ? '⏳' : 'Share'}
                  </button>
                  <button
                    className="tool-btn"
                    onClick={handleCopyJson}
                    title="Copy JSON content"
                  >
                    Copy
                  </button>
                </div>
              </div>
              <div className="editor-container">
                {currentDoc && (
                  <Editor
                    height="100%"
                    defaultLanguage="json"
                    theme="superJSON"
                    value={currentDoc.inputContent}
                    onChange={(value) => {
                      if (value !== undefined && currentDoc) {
                        updateInputContent(currentDoc.id, value)
                      }
                    }}
                    options={{
                      fontSize: 13,
                      minimap: { enabled: false },
                      wordWrap: 'on',
                      lineNumbers: 'on',
                      scrollBeyondLastLine: false,
                      automaticLayout: true,
                      formatOnPaste: true,
                      formatOnType: true,
                      folding: true,
                      tabSize: 2,
                      fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei UI', 'Microsoft YaHei', 'Source Han Sans SC', monospace",
                      maxTokenizationLineLength: 100000,
                    }}
                  />
                )}
              </div>
            </div>
            
            <div className="panel panel-layer" style={{ flex: 1 }}>
              <div className="panel-header">
                LAYERS
                <span className="panel-info">{currentDoc?.layers.length || 0} layers</span>
                {currentDoc && currentDoc.layers.length > 0 && (
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
                    <button 
                      className="layer-action-btn"
                      onClick={() => handleSaveLayerAsDoc()}
                      title="Save current layer as new document"
                    >
                      Save as Doc
                    </button>
                    <button 
                      className="layer-action-btn"
                      onClick={() => handleReplaceFromDoc()}
                      title="Replace current layer from another document"
                    >
                      Replace from Doc
                    </button>
                  </div>
                )}
              </div>
              <div className="editor-container" style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
                {currentDoc && (
                  <div style={{ flexShrink: 0, zIndex: 10 }}>
                    <Breadcrumb
                      layers={currentDoc.layers}
                      activeLayerIndex={activeLayerIndex}
                      onSelectLayer={setActiveLayerIndex}
                    />
                  </div>
                )}
                {currentDoc && currentDoc.layers.length > 0 && (
                  <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', position: 'relative' }}>
                    <Editor
                      key={`layer-${activeLayerIndex}-${currentDoc.id}`}
                      height="100%"
                      defaultLanguage="json"
                      theme="superJSON"
                      value={
                        editorValues[activeLayerIndex] ||
                        (typeof currentDoc.layers[activeLayerIndex]?.content === 'string'
                          ? currentDoc.layers[activeLayerIndex].content
                          : JSON.stringify(currentDoc.layers[activeLayerIndex]?.content, null, 2))
                      }
                      onChange={handleLayerChange}
                      options={{
                        fontSize: 13,
                        minimap: { enabled: false },
                        wordWrap: 'on',
                        lineNumbers: 'on',
                        scrollBeyondLastLine: false,
                        automaticLayout: true,
                        formatOnPaste: true,
                        formatOnType: true,
                        folding: true,
                        tabSize: 2,
                        fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei UI', 'Microsoft YaHei', 'Source Han Sans SC', monospace",
                        maxTokenizationLineLength: 100000, // 增加到100000字符
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
            
            {/* Document Selector Dropdown */}
            {showDocSelector && currentDoc && currentDoc.layers.length > 0 && (
              <div 
                className="doc-selector-dropdown"
                style={{
                  position: 'absolute',
                  top: '35px',
                  right: '15px',
                  background: 'var(--bg-panel)',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  padding: '8px',
                  zIndex: 1000,
                  minWidth: '200px',
                  maxWidth: '300px',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)'
                }}
              >
                <div style={{
                  fontSize: '11px',
                  color: 'var(--text-dim)',
                  marginBottom: '8px',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Select Document
                </div>
                {documents.filter(d => d.id !== currentDoc.id).length === 0 ? (
                  <div style={{
                    fontSize: '12px',
                    color: 'var(--text-dim)',
                    padding: '10px',
                    textAlign: 'center'
                  }}>
                    No other documents available
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {documents.filter(d => d.id !== currentDoc.id).map(doc => (
                      <button
                        key={doc.id}
                        onClick={() => handleSelectDocForReplace(doc)}
                        style={{
                          background: 'rgba(31, 182, 255, 0.05)',
                          border: '1px solid var(--border)',
                          borderRadius: '4px',
                          padding: '8px 12px',
                          cursor: 'pointer',
                          color: 'var(--text-secondary)',
                          fontSize: '12px',
                          textAlign: 'left',
                          transition: 'all 0.2s',
                          fontFamily: 'JetBrains Mono, monospace'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(31, 182, 255, 0.1)'
                          e.currentTarget.style.borderColor = 'var(--text-secondary)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'rgba(31, 182, 255, 0.05)'
                          e.currentTarget.style.borderColor = 'var(--border)'
                        }}
                      >
                        <div style={{ fontWeight: '500' }}>{doc.title}</div>
                        <div style={{ 
                          fontSize: '10px', 
                          color: 'var(--text-dim)', 
                          marginTop: '2px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          maxWidth: '250px'
                        }}>
                          {doc.inputContent.substring(0, 50)}...
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                <button
                  onClick={() => setShowDocSelector(false)}
                  style={{
                    marginTop: '8px',
                    width: '100%',
                    padding: '6px',
                    background: 'transparent',
                    border: '1px solid var(--border)',
                    borderRadius: '4px',
                    color: 'var(--text-dim)',
                    cursor: 'pointer',
                    fontSize: '11px',
                    fontFamily: 'JetBrains Mono, monospace',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--error)'
                    e.currentTarget.style.color = 'var(--error)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border)'
                    e.currentTarget.style.color = 'var(--text-dim)'
                  }}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        )
    }
  }

  const handleDoubleClickTab = (doc: typeof documents[0]) => {
    setEditingDocId(doc.id)
    setEditTitle(doc.title)
  }

  const handleTitleSubmit = () => {
    if (editingDocId && editTitle.trim()) {
      updateDocumentTitle(editingDocId, editTitle.trim())
    }
    setEditingDocId(null)
  }

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTitleSubmit()
    } else if (e.key === 'Escape') {
      setEditingDocId(null)
    }
  }

  // Drag and drop handlers
  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    setDragOverIndex(index)
  }

  const handleDragLeave = () => {
    setDragOverIndex(null)
  }

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    if (draggedIndex !== null && draggedIndex !== dropIndex) {
      reorderDocuments(draggedIndex, dropIndex)
    }
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  const renderActions = () => {
    if (viewMode === 'processor') {
      return (
        <div className="actions">
          <button className="btn" onClick={copyOutput}>Copy</button>
          <button className="btn primary" onClick={applyToInput}>Apply</button>
        </div>
      )
    }
    
    if (viewMode === 'hero') {
      return null // Hero mode has inline buttons
    }
    
    if (viewMode === 'diff') {
      return null // Diff mode doesn't need actions
    }
    
    // Layer mode
    return (
      <div className="actions">
        <button className="btn" onClick={handleAnalyze}>Parse</button>
        <button className="btn primary" onClick={handleGenerate}>Apply</button>
      </div>
    )
  }

  return (
    <div className="container">
      <div className="sidebar">
        <button 
          className={`mode-btn ${viewMode === 'layer' ? 'active' : ''}`}
          onClick={() => setViewMode('layer')}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7"/>
            <rect x="14" y="3" width="7" height="7"/>
            <rect x="14" y="14" width="7" height="7"/>
            <rect x="3" y="14" width="7" height="7"/>
          </svg>
          <span className="mode-label">LAYER</span>
        </button>
        <button 
          className={`mode-btn ${viewMode === 'processor' ? 'active' : ''}`}
          onClick={() => setViewMode('processor')}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polyline>
          </svg>
          <span className="mode-label">TOOLS</span>
        </button>
        <button 
          className={`mode-btn ${viewMode === 'hero' ? 'active' : ''}`}
          onClick={() => setViewMode('hero')}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"/>
          </svg>
          <span className="mode-label">HERO</span>
        </button>
        <button 
          className={`mode-btn ${viewMode === 'diff' ? 'active' : ''}`}
          onClick={() => setViewMode('diff')}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M16 2v20M8 2v20M3 12h18"/>
          </svg>
          <span className="mode-label">DIFF</span>
        </button>
      </div>
      
      <div className="main-area">
        <div className="header">
          <div className="logo">
            <img src={iconImg} alt="Logo" style={{ width: 28, height: 28 }} />
            <span className="title">SUPER JSON</span>
          </div>
          {renderActions()}
        </div>
        
        <div className="tabs">
          {documents.map((doc, index) => (
            <div 
              key={doc.id}
              className={`tab ${doc.id === currentDocId ? 'active' : ''} ${dragOverIndex === index ? 'drag-over' : ''}`}
              onClick={() => switchDocument(doc.id)}
              onDoubleClick={() => handleDoubleClickTab(doc)}
              draggable={!editingDocId}
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
              style={{
                opacity: draggedIndex === index ? 0.5 : 1,
                cursor: editingDocId ? 'text' : 'move'
              }}
            >
              {editingDocId === doc.id ? (
                <input
                  ref={inputRef}
                  className="tab-title-input"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onBlur={handleTitleSubmit}
                  onKeyDown={handleTitleKeyDown}
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: 'inherit',
                    font: 'inherit',
                    padding: 0,
                    margin: 0,
                    width: '100px'
                  }}
                />
              ) : (
                <span>{doc.title}</span>
              )}
              {documents.length > 1 && (
                <span 
                  className="tab-close"
                  onClick={(e) => {
                    e.stopPropagation()
                    deleteDocument(doc.id)
                  }}
                >
                  ×
                </span>
              )}
            </div>
          ))}
          <div 
            style={{ display: 'inline-flex', alignItems: 'center' }}
            onMouseEnter={() => setShowPasteButton(true)}
            onMouseLeave={() => setShowPasteButton(false)}
          >
            <button className="tab-add" onClick={createDocument}>+</button>
            {showPasteButton && (
              <button
                onClick={handlePaste}
                aria-label="Paste from clipboard"
                title="New document from clipboard"
                style={{ 
                  height: '26px',
                  padding: '0 10px',
                  background: 'rgba(31, 182, 255, 0.05)',
                  color: 'var(--text-dim)',
                  marginLeft: '6px',
                  borderRadius: '4px',
                  border: '1px solid var(--border)',
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontWeight: '400',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  animation: 'slideInFromLeft 0.2s ease-out',
                  transition: 'all 0.2s',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(31, 182, 255, 0.1)';
                  e.currentTarget.style.color = 'var(--text-secondary)';
                  e.currentTarget.style.borderColor = 'var(--text-secondary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(31, 182, 255, 0.05)';
                  e.currentTarget.style.color = 'var(--text-dim)';
                  e.currentTarget.style.borderColor = 'var(--border)';
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
              </button>
            )}
          </div>
        </div>
        
        {renderContent()}
        
        <div className="status">
          <div className="status-item">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" style={{ opacity: 0.8 }}>
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.012 8.012 0 0 0 16 8c0-4.42-3.58-8-8-8z"/>
            </svg>
            <a 
              href="https://github.com/hrhrng/super-json" 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ 
                color: 'inherit', 
                textDecoration: 'none',
                marginLeft: '6px',
                transition: 'color 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'inherit'}
            >
              hrhrng/super-json
            </a>
          </div>
          <div className="status-item" style={{ marginLeft: 'auto' }}>
            {viewMode === 'layer' && `${currentDoc?.layers.length || 0} layers`}
            {viewMode === 'processor' && 'Processor'}
            {viewMode === 'hero' && 'Hero View'}
            {viewMode === 'diff' && (compareDocId 
              ? `Comparing: ${documents.find(d => d.id === compareDocId)?.title} ↔ ${currentDoc?.title}` 
              : 'Select document to compare')}
          </div>
        </div>
      </div>
    </div>
  )
}