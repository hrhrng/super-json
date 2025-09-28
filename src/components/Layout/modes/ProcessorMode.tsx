import { useState, useRef, useCallback } from 'react'
import Editor from '@monaco-editor/react'
import { useDocumentStore } from '@stores/documentStore'
import { showNotification, useNotification } from '@components/Notification/Notification'
import { createShareUrl, copyToClipboard } from '@utils/simpleShare'
import { formatJsonBestEffort, minifyJsonBestEffort } from '@utils/jsonFormatter'
import type { editor } from 'monaco-editor'

interface ProcessorModeProps {
  processorOutput: string
  setProcessorOutput: (output: string) => void
}

export function ProcessorMode({ processorOutput, setProcessorOutput }: ProcessorModeProps) {
  const { getCurrentDocument, updateInputContent } = useDocumentStore()
  const { showNotification: showNotificationHook } = useNotification()
  const [sharingDoc, setSharingDoc] = useState(false)
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)
  const formatTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  
  const currentDoc = getCurrentDocument()

  const handleEagerFormat = useCallback((value: string) => {
    if (!currentDoc || !editorRef.current) return
    
    if (formatTimeoutRef.current) {
      clearTimeout(formatTimeoutRef.current)
    }
    
    formatTimeoutRef.current = setTimeout(() => {
      const lines = value.split('\n')
      const lastChar = value.trim().slice(-1)
      
      const shouldFormat = (lastChar === '}' || lastChar === ']') && lines.length > 1
      
      if (shouldFormat) {
        try {
          JSON.parse(value)
          // If JSON is valid, trigger Monaco's built-in formatter
          editorRef.current?.getAction('editor.action.formatDocument')?.run()
        } catch {
          // If JSON is invalid, try best-effort formatting
          const result = formatJsonBestEffort(value)
          if (result.mode === 'strict' && result.output !== value) {
            const position = editorRef.current?.getPosition()
            updateInputContent(currentDoc.id, result.output)
            // Restore cursor position after update
            setTimeout(() => {
              if (position && editorRef.current) {
                editorRef.current.setPosition(position)
              }
            }, 0)
          }
        }
      }
    }, 300)
  }, [currentDoc, updateInputContent])

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
    const result = formatJsonBestEffort(currentDoc.inputContent)
    setProcessorOutput(result.output)
    if (result.mode === 'strict') {
      showNotification('Formatted successfully', 'success')
    } else {
      showNotification('Input contains errors; applied best-effort formatting', 'warning')
    }
  }

  const minifyJSON = () => {
    if (!currentDoc?.inputContent) return
    const result = minifyJsonBestEffort(currentDoc.inputContent)
    setProcessorOutput(result.output)
    if (result.mode === 'strict') {
      showNotification('Minified successfully', 'success')
    } else {
      showNotification('Input contains errors; applied best-effort minification', 'warning')
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
      // Convert string to UTF-8 bytes then to base64
      const bytes = new TextEncoder().encode(currentDoc.inputContent)
      const binString = Array.from(bytes, byte => String.fromCodePoint(byte)).join('')
      const encoded = btoa(binString)
      setProcessorOutput(encoded)
      showNotification('Base64 encoded successfully', 'success')
    } catch {
      showNotification('Failed to encode', 'error')
    }
  }

  const base64Decode = () => {
    if (!currentDoc?.inputContent) return
    try {
      // Decode base64 to bytes then to UTF-8 string
      const binString = atob(currentDoc.inputContent)
      const bytes = new Uint8Array(binString.length)
      for (let i = 0; i < binString.length; i++) {
        bytes[i] = binString.codePointAt(i)!
      }
      const decoded = new TextDecoder().decode(bytes)
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

  const camelToSnake = () => {
    if (!currentDoc?.inputContent) return
    try {
      const parsed = JSON.parse(currentDoc.inputContent)
      const convertKeysToSnakeCase = (obj: any): any => {
        if (Array.isArray(obj)) {
          return obj.map(convertKeysToSnakeCase)
        } else if (obj !== null && typeof obj === 'object') {
          return Object.keys(obj).reduce((result: any, key) => {
            const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`).replace(/^_/, '')
            result[snakeKey] = convertKeysToSnakeCase(obj[key])
            return result
          }, {})
        }
        return obj
      }
      const converted = JSON.stringify(convertKeysToSnakeCase(parsed), null, 2)
      setProcessorOutput(converted)
      showNotification('Converted to snake_case successfully', 'success')
    } catch {
      showNotification('Invalid JSON format', 'error')
    }
  }

  const snakeToCamel = () => {
    if (!currentDoc?.inputContent) return
    try {
      const parsed = JSON.parse(currentDoc.inputContent)
      const convertKeysToCamelCase = (obj: any): any => {
        if (Array.isArray(obj)) {
          return obj.map(convertKeysToCamelCase)
        } else if (obj !== null && typeof obj === 'object') {
          return Object.keys(obj).reduce((result: any, key) => {
            const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
            result[camelKey] = convertKeysToCamelCase(obj[key])
            return result
          }, {})
        }
        return obj
      }
      const converted = JSON.stringify(convertKeysToCamelCase(parsed), null, 2)
      setProcessorOutput(converted)
      showNotification('Converted to camelCase successfully', 'success')
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
              onMount={(editor) => {
                editorRef.current = editor
              }}
              onChange={(value) => {
                if (value !== undefined && currentDoc) {
                  updateInputContent(currentDoc.id, value)
                  handleEagerFormat(value)
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
          <button className="tool-btn" onClick={camelToSnake}>camelCase → snake_case</button>
          <button className="tool-btn" onClick={snakeToCamel}>snake_case → camelCase</button>
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
