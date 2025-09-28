import { useState, useEffect } from 'react'
import Editor from '@monaco-editor/react'
import { useDocumentStore } from '@stores/documentStore'
import { Breadcrumb } from '@components/Breadcrumb/Breadcrumb'
import { showNotification, useNotification } from '@components/Notification/Notification'
import { createShareUrl, copyToClipboard } from '@utils/simpleShare'

interface LayerModeProps {
  activeLayerIndex: number
  setActiveLayerIndex: (index: number) => void
}

export function LayerMode({ activeLayerIndex, setActiveLayerIndex }: LayerModeProps) {
  const { 
    documents,
    updateLayer,
    updateLayers,
    updateInputContent,
    createDocument,
    switchDocument,
    getCurrentDocument
  } = useDocumentStore()
  
  const { showNotification: showNotificationHook } = useNotification()
  const [showDocSelector, setShowDocSelector] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [editorValues, setEditorValues] = useState<Record<number, string>>({})
  const [sharingDoc, setSharingDoc] = useState(false)
  
  const currentDoc = getCurrentDocument()

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

  // Store editor values to maintain them during sync
  useEffect(() => {
    if (currentDoc && currentDoc.layers[activeLayerIndex]) {
      const content = currentDoc.layers[activeLayerIndex].content
      const value = typeof content === 'string' ? content : JSON.stringify(content, null, 2)
      setEditorValues(prev => ({ ...prev, [activeLayerIndex]: value }))
    }
  }, [activeLayerIndex, currentDoc])

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


  const updateChildLayers = (layers: any[], parentIndex: number, visited: Set<number> = new Set()) => {
    if (visited.has(parentIndex)) return
    visited.add(parentIndex)
    
    const parentLayer = layers[parentIndex]
    if (!parentLayer) return
    
    layers.forEach((layer, index) => {
      if (layer.parentIndex === parentIndex && layer.parentField) {
        const keys = layer.parentField.match(/[^.\[\]]+/g) || []
        let fieldValue = parentLayer.content
        
        for (const key of keys) {
          if (fieldValue && typeof fieldValue === 'object') {
            fieldValue = fieldValue[key]
          }
        }
        
        if (typeof fieldValue === 'string') {
          try {
            const parsed = JSON.parse(fieldValue)
            layers[index].content = parsed
            
            if (index !== activeLayerIndex) {
              setEditorValues(prev => ({ 
                ...prev, 
                [index]: JSON.stringify(parsed, null, 2) 
              }))
            }
            
            updateChildLayers(layers, index, visited)
          } catch {
            // Invalid JSON, keep original
          }
        }
      }
    })
  }

  const updateParentLayers = (layers: any[], childIndex: number, visited: Set<number> = new Set()) => {
    if (visited.has(childIndex)) return
    visited.add(childIndex)
    
    const childLayer = layers[childIndex]
    if (!childLayer) return
    
    if (childLayer.parentIndex !== undefined && childLayer.parentIndex >= 0 && childLayer.parentField) {
      const parentLayer = layers[childLayer.parentIndex]
      if (!parentLayer) return
      
      // Special handling for [parsed] field - replace entire parent content
      if (childLayer.parentField === '[parsed]') {
        // The entire parent is an escaped JSON string, replace it completely
        layers[childLayer.parentIndex].content = childLayer.content
        
        if (childLayer.parentIndex !== activeLayerIndex) {
          setEditorValues(prev => ({ 
            ...prev, 
            [childLayer.parentIndex]: JSON.stringify(childLayer.content, null, 2) 
          }))
        }
      } else {
        // Normal field update
        const parentContent = typeof parentLayer.content === 'object' 
          ? JSON.parse(JSON.stringify(parentLayer.content))
          : parentLayer.content
        
        const updatedContent = JSON.stringify(childLayer.content)
        
        const keys = childLayer.parentField.match(/[^.\[\]]+/g) || []
        let current = parentContent
        
        for (let i = 0; i < keys.length - 1; i++) {
          const key = keys[i]
          if (typeof current === 'object' && current !== null) {
            if (!(key in current)) {
              const nextKey = keys[i + 1]
              current[key] = /^\d+$/.test(nextKey) ? [] : {}
            }
            current = current[key]
          }
        }
        
        if (current && typeof current === 'object' && keys.length > 0) {
          current[keys[keys.length - 1]] = updatedContent
        }
        
        layers[childLayer.parentIndex].content = parentContent
        
        if (childLayer.parentIndex !== activeLayerIndex) {
          setEditorValues(prev => ({ 
            ...prev, 
            [childLayer.parentIndex]: JSON.stringify(parentContent, null, 2) 
          }))
        }
      }
      
      updateParentLayers(layers, childLayer.parentIndex, visited)
    }
  }

  const syncLayers = (layers: any[], changedIndex: number) => {
    setIsUpdating(true)
    
    updateChildLayers(layers, changedIndex)
    updateParentLayers(layers, changedIndex)
    
    if (currentDoc) {
      updateLayers(currentDoc.id, layers)
      
      setTimeout(() => {
        setIsUpdating(false)
      }, 100)
    }
  }

  const handleLayerChange = (value: string | undefined) => {
    if (!currentDoc || value === undefined || isUpdating) return
    
    setEditorValues(prev => ({ ...prev, [activeLayerIndex]: value }))
    
    try {
      const parsed = JSON.parse(value)
      const newLayers = currentDoc.layers.map(l => ({
        ...l,
        content: typeof l.content === 'object' ? JSON.parse(JSON.stringify(l.content)) : l.content
      }))
      
      newLayers[activeLayerIndex].content = parsed
      syncLayers(newLayers, activeLayerIndex)
    } catch (error) {
      updateLayer(currentDoc.id, activeLayerIndex, value)
    }
  }

  const handleSaveLayerAsDoc = () => {
    if (!currentDoc || !currentDoc.layers[activeLayerIndex]) return
    
    const currentLayer = currentDoc.layers[activeLayerIndex]
    const layerContent = typeof currentLayer.content === 'string' 
      ? currentLayer.content 
      : JSON.stringify(currentLayer.content, null, 2)
    
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
    
    setShowDocSelector(true)
  }
  
  const handleSelectDocForReplace = (sourceDoc: any) => {
    if (!currentDoc || !currentDoc.layers[activeLayerIndex]) return
    
    const newContent = sourceDoc.inputContent
    
    let parsedContent: any
    try {
      parsedContent = JSON.parse(newContent)
    } catch {
      parsedContent = newContent
    }
    
    updateLayer(currentDoc.id, activeLayerIndex, parsedContent)
    
    showNotification(`Replaced from "${sourceDoc.title}"`, 'success')
    setShowDocSelector(false)
  }

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
                onClick={handleSaveLayerAsDoc}
                title="Save current layer as new document"
              >
                Save as Doc
              </button>
              <button 
                className="layer-action-btn"
                onClick={handleReplaceFromDoc}
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
                  maxTokenizationLineLength: 100000,
                }}
              />
            </div>
          )}
        </div>
      </div>
      
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

export function LayerModeActions({ onAnalyze, onGenerate }: { onAnalyze: () => void, onGenerate: () => void }) {
  return (
    <div className="actions">
      <button className="btn" onClick={onAnalyze}>Parse</button>
      <button className="btn primary" onClick={onGenerate}>Apply</button>
    </div>
  )
}