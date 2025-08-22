import { useState } from 'react'
import Editor from '@monaco-editor/react'
import { useDocumentStore } from '@stores/documentStore'
import { showNotification, useNotification } from '@components/Notification/Notification'
import { createShareUrl, copyToClipboard } from '@utils/simpleShare'

interface ProcessorModeProps {
  processorOutput: string
  setProcessorOutput: (output: string) => void
}

export function ProcessorMode({ processorOutput, setProcessorOutput }: ProcessorModeProps) {
  const { getCurrentDocument, updateInputContent } = useDocumentStore()
  const { showNotification: showNotificationHook } = useNotification()
  const [sharingDoc, setSharingDoc] = useState(false)
  
  const currentDoc = getCurrentDocument()

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

  const formatJSON = () => {
    if (!currentDoc?.inputContent) return
    try {
      const parsed = JSON.parse(currentDoc.inputContent)
      const formatted = JSON.stringify(parsed, null, 2)
      setProcessorOutput(formatted)
      showNotification('Formatted successfully', 'success')
    } catch {
      showNotification('Invalid JSON format', 'error')
    }
  }

  const minifyJSON = () => {
    if (!currentDoc?.inputContent) return
    try {
      const parsed = JSON.parse(currentDoc.inputContent)
      const minified = JSON.stringify(parsed)
      setProcessorOutput(minified)
      showNotification('Minified successfully', 'success')
    } catch {
      showNotification('Invalid JSON format', 'error')
    }
  }

  const escapeJSON = () => {
    if (!currentDoc?.inputContent) return
    try {
      const escaped = JSON.stringify(currentDoc.inputContent)
      setProcessorOutput(escaped)
      showNotification('Escaped successfully', 'success')
    } catch {
      showNotification('Failed to escape', 'error')
    }
  }

  const unescapeJSON = () => {
    if (!currentDoc?.inputContent) return
    try {
      const unescaped = JSON.parse(currentDoc.inputContent)
      if (typeof unescaped === 'string') {
        setProcessorOutput(unescaped)
        showNotification('Unescaped successfully', 'success')
      } else {
        setProcessorOutput(JSON.stringify(unescaped, null, 2))
        showNotification('Unescaped successfully', 'success')
      }
    } catch {
      showNotification('Failed to unescape', 'error')
    }
  }

  const base64Encode = () => {
    if (!currentDoc?.inputContent) return
    try {
      const encoded = btoa(unescape(encodeURIComponent(currentDoc.inputContent)))
      setProcessorOutput(encoded)
      showNotification('Base64 encoded successfully', 'success')
    } catch {
      showNotification('Failed to encode', 'error')
    }
  }

  const base64Decode = () => {
    if (!currentDoc?.inputContent) return
    try {
      const decoded = decodeURIComponent(escape(atob(currentDoc.inputContent)))
      setProcessorOutput(decoded)
      showNotification('Base64 decoded successfully', 'success')
    } catch {
      showNotification('Failed to decode', 'error')
    }
  }

  const urlEncode = () => {
    if (!currentDoc?.inputContent) return
    const encoded = encodeURIComponent(currentDoc.inputContent)
    setProcessorOutput(encoded)
    showNotification('URL encoded successfully', 'success')
  }

  const urlDecode = () => {
    if (!currentDoc?.inputContent) return
    try {
      const decoded = decodeURIComponent(currentDoc.inputContent)
      setProcessorOutput(decoded)
      showNotification('URL decoded successfully', 'success')
    } catch {
      showNotification('Failed to decode', 'error')
    }
  }

  const sortKeys = () => {
    if (!currentDoc?.inputContent) return
    try {
      const parsed = JSON.parse(currentDoc.inputContent)
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
      showNotification('Keys sorted successfully', 'success')
    } catch {
      showNotification('Invalid JSON format', 'error')
    }
  }

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
}

export function ProcessorModeActions({ onCopy, onApply }: { onCopy: () => void, onApply: () => void }) {
  return (
    <div className="actions">
      <button className="btn" onClick={onCopy}>Copy</button>
      <button className="btn primary" onClick={onApply}>Apply</button>
    </div>
  )
}