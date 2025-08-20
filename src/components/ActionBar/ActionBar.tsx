import { useCallback } from 'react'
import toast from 'react-hot-toast'
import { useDocumentStore } from '@stores/documentStore'
import { useAppStore } from '@stores/appStore'
import { useDocument } from '@components/DocumentContext'
import { JSONLayerAnalyzer } from '@utils/jsonAnalyzer'

const analyzer = new JSONLayerAnalyzer()

export function ActionBar() {
  const { currentDocument } = useDocument()
  const { updateLayers, updateOutputContent, updateInputContent } = useDocumentStore()
  const { isAnalyzing, isGenerating, setAnalyzing, setGenerating } = useAppStore()

  const handleAnalyze = useCallback(async () => {
    if (!currentDocument || isAnalyzing) return
    
    setAnalyzing(true)
    
    try {
      const layers = analyzer.analyze(currentDocument.inputContent)
      updateLayers(currentDocument.id, layers)
      toast.success(`Found ${layers.length} layer${layers.length > 1 ? 's' : ''}`)
    } catch (error) {
      toast.error('Failed to analyze JSON')
      console.error(error)
    } finally {
      setAnalyzing(false)
    }
  }, [currentDocument, isAnalyzing, setAnalyzing, updateLayers])

  const handleGenerate = useCallback(async () => {
    if (!currentDocument || isGenerating) return
    
    setGenerating(true)
    
    try {
      const output = analyzer.rebuild(currentDocument.layers)
      updateOutputContent(currentDocument.id, output)
      toast.success('Output generated successfully')
    } catch (error) {
      toast.error('Failed to generate output')
      console.error(error)
    } finally {
      setGenerating(false)
    }
  }, [currentDocument, isGenerating, setGenerating, updateOutputContent])

  const handleApplyToInput = useCallback(() => {
    if (!currentDocument || !currentDocument.outputContent) {
      toast.error('No output to apply')
      return
    }
    
    updateInputContent(currentDocument.id, currentDocument.outputContent)
    toast.success('Output applied to input')
  }, [currentDocument, updateInputContent])

  return (
    <div className="action-bar">
      <button
        className="action-btn primary"
        onClick={handleAnalyze}
        disabled={!currentDocument || isAnalyzing}
      >
        {isAnalyzing ? '分析中...' : '智能分析'}
      </button>
      
      <button
        className="action-btn secondary"
        onClick={handleGenerate}
        disabled={!currentDocument || currentDocument.layers.length === 0 || isGenerating}
      >
        {isGenerating ? '生成中...' : '生成输出'}
      </button>
      
      <button
        className="action-btn tertiary"
        onClick={handleApplyToInput}
        disabled={!currentDocument || !currentDocument.outputContent}
      >
        应用到输入
      </button>
    </div>
  )
}