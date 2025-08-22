import Editor from '@monaco-editor/react'
import { useDocumentStore } from '@stores/documentStore'
import { showNotification } from '@components/Notification/Notification'

export function HeroMode() {
  const { getCurrentDocument, updateInputContent, updateHeroUrl } = useDocumentStore()
  const currentDoc = getCurrentDocument()

  const loadIntoHero = async () => {
    if (!currentDoc?.inputContent) return
    try {
      const parsed = JSON.parse(currentDoc.inputContent)
      
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
}