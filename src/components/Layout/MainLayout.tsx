import { useEffect, useState } from 'react'
import { loader } from '@monaco-editor/react'
import { useDocumentStore } from '@stores/documentStore'
import { useAppStore } from '@stores/appStore'
import { JSONLayerAnalyzer } from '@utils/jsonAnalyzer'
import { showNotification } from '@components/Notification/Notification'
import { useSimpleImport } from '@hooks/useSimpleImport'

// Components
import { DocumentTabs } from './components/DocumentTabs'
import { ViewModeButtons } from './components/ViewModeButtons'
import { LayerMode, LayerModeActions } from './modes/LayerMode'
import { ProcessorMode, ProcessorModeActions } from './modes/ProcessorMode'
import { DiffMode } from './modes/DiffMode'
import { HeroMode } from './modes/HeroMode'

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
    currentDocId,
    updateInputContent,
    updateLayers,
    loadFromLocalStorage,
    getCurrentDocument
  } = useDocumentStore()
  
  const { viewMode, loadSettings } = useAppStore()
  const [activeLayerIndex, setActiveLayerIndex] = useState(0)
  const [processorOutput, setProcessorOutput] = useState('')
  
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

  // Layer mode handlers
  const handleAnalyze = () => {
    if (!currentDoc) return
    
    const input = currentDoc.inputContent.trim()
    if (!input) {
      showNotification('请输入JSON内容', 'error')
      return
    }
    
    try {
      const layers = analyzer.analyze(currentDoc.inputContent)
      
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
      updateInputContent(currentDoc.id, output)
      showNotification('应用成功', 'success')
    } catch (error) {
      showNotification('应用失败', 'error')
    }
  }

  // Processor mode handlers  
  const copyOutput = () => {
    navigator.clipboard.writeText(processorOutput)
    showNotification('已复制到剪贴板', 'success')
  }

  const applyToInput = () => {
    if (!processorOutput || !currentDoc) return
    updateInputContent(currentDoc.id, processorOutput)
    showNotification('已应用到输入', 'success')
  }

  const renderContent = () => {
    switch(viewMode) {
      case 'processor':
        return <ProcessorMode processorOutput={processorOutput} setProcessorOutput={setProcessorOutput} />
      case 'diff':
        return <DiffMode />
      case 'hero':
        return <HeroMode />
      default: // layer mode
        return (
          <LayerMode 
            activeLayerIndex={activeLayerIndex}
            setActiveLayerIndex={setActiveLayerIndex}
          />
        )
    }
  }

  const renderActions = () => {
    if (viewMode === 'processor') {
      return <ProcessorModeActions onCopy={copyOutput} onApply={applyToInput} />
    }
    
    if (viewMode === 'hero' || viewMode === 'diff') {
      return null
    }
    
    // Layer mode
    return <LayerModeActions onAnalyze={handleAnalyze} onGenerate={handleGenerate} />
  }

  return (
    <div className="container">
      <ViewModeButtons />
      
      <div className="main-area">
        <div className="header">
          <div className="logo">
            <img src={iconImg} alt="Logo" style={{ width: 28, height: 28 }} />
            <span className="title">SUPER JSON</span>
          </div>
          {renderActions()}
        </div>
        
        <DocumentTabs />
        
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
            {viewMode === 'diff' && 'Diff Mode'}
          </div>
        </div>
      </div>
    </div>
  )
}