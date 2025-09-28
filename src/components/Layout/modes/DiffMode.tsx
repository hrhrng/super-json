import { useState } from 'react'
import Editor, { DiffEditor } from '@monaco-editor/react'
import { useDocumentStore } from '@stores/documentStore'
import { formatJsonBestEffort } from '@utils/jsonFormatter'

export function DiffMode() {
  const { documents, currentDocId, getCurrentDocument, updateInputContent } = useDocumentStore()
  const [compareDocId, setCompareDocId] = useState<string | null>(null)
  const [showOnlyDifferences, setShowOnlyDifferences] = useState(true)
  
  const currentDoc = getCurrentDocument()
  const otherDocs = documents.filter(d => d.id !== currentDocId)
  const compareDoc = compareDocId ? documents.find(d => d.id === compareDocId) : null
  
  const formatJson = (content: string) => {
    if (!content.trim()) return content
    const result = formatJsonBestEffort(content)
    return result.output || content
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
              originalEditable: true,
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
              
              originalEditor.pushUndoStop()
              originalEditor.focus()
              
              let isInternalUpdate = false
              originalEditor.onDidChangeModelContent(() => {
                if (isInternalUpdate) return
                
                const newContent = originalEditor.getValue()
                if (currentDoc) {
                  updateInputContent(currentDoc.id, newContent)
                }
              })
            }}
          />
        ) : (
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
                    editor.setValue(formatJson(currentDoc.inputContent))
                    editor.focus()
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
}
