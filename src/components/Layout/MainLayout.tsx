import { useEffect, useState } from 'react'
import Editor, { loader } from '@monaco-editor/react'
import { useDocumentStore } from '@stores/documentStore'
import { useAppStore } from '@stores/appStore'
import { JSONLayerAnalyzer } from '@utils/jsonAnalyzer'
import { Breadcrumb } from '@components/Breadcrumb/Breadcrumb'
import { showNotification } from '@components/Notification/Notification'

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
    loadFromLocalStorage,
    getCurrentDocument
  } = useDocumentStore()
  
  const { viewMode, setViewMode, loadSettings } = useAppStore()
  const [processorOutput, setProcessorOutput] = useState('')
  const [heroUrl, setHeroUrl] = useState('')
  const [activeLayerIndex, setActiveLayerIndex] = useState(0)
  
  const currentDoc = getCurrentDocument()

  useEffect(() => {
    loadSettings()
    loadFromLocalStorage()
  }, [])

  // Reset active layer when document changes
  useEffect(() => {
    setActiveLayerIndex(0)
  }, [currentDocId])

  const handleAnalyze = () => {
    if (!currentDoc) return
    try {
      const layers = analyzer.analyze(currentDoc.inputContent)
      updateLayers(currentDoc.id, layers)
      setActiveLayerIndex(0)
      showNotification(`成功解析 ${layers.length} 个JSON层级`, 'success')
    } catch (error) {
      showNotification('解析失败', 'error')
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
        setHeroUrl(data.location)
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
                      fontFamily: 'JetBrains Mono, monospace',
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
                      fontFamily: 'JetBrains Mono, monospace',
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
                {heroUrl ? (
                  <iframe 
                    src={heroUrl}
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
          <div className="content" id="layerMode">
            <div className="panel panel-input">
              <div className="panel-header">
                INPUT
                <span className="panel-info">JSON</span>
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
                      fontFamily: 'JetBrains Mono, monospace',
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
              </div>
              <div className="editor-container" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                {currentDoc && (
                  <div style={{ flexShrink: 0 }}>
                    <Breadcrumb
                      layers={currentDoc.layers}
                      activeLayerIndex={activeLayerIndex}
                      onSelectLayer={setActiveLayerIndex}
                    />
                  </div>
                )}
                {currentDoc && currentDoc.layers.length > 0 && (
                  <div style={{ flex: 1, overflow: 'hidden' }}>
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
                        fontFamily: 'JetBrains Mono, monospace',
                        maxTokenizationLineLength: 100000, // 增加到100000字符
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        )
    }
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
      </div>
      
      <div className="main-area">
        <div className="header">
          <div className="logo">
            <img src="/icon.png" alt="Logo" style={{ width: 28, height: 28 }} />
            <span className="title">SUPER JSON</span>
          </div>
          {renderActions()}
        </div>
        
        <div className="tabs">
          {documents.map(doc => (
            <div 
              key={doc.id}
              className={`tab ${doc.id === currentDocId ? 'active' : ''}`}
              onClick={() => switchDocument(doc.id)}
            >
              {doc.title}
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
          <button className="tab-add" onClick={createDocument}>+</button>
        </div>
        
        {renderContent()}
        
        <div className="status">
          <div className="status-item">
            <span className="status-dot active"></span>
            Ready
          </div>
          <div className="status-item" style={{ marginLeft: 'auto' }}>
            {viewMode === 'layer' && `Layers: ${currentDoc?.layers.length || 0}`}
            {viewMode === 'processor' && 'Processor Mode'}
            {viewMode === 'hero' && 'Hero Mode'}
          </div>
        </div>
      </div>
    </div>
  )
}