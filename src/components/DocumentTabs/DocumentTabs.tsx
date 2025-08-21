import { useState, useRef, useEffect } from 'react'
import { useDocumentStore } from '@stores/documentStore'
import { useNotification } from '@components/Notification/Notification'
import clsx from 'clsx'

export function DocumentTabs() {
  const { 
    documents, 
    currentDocId, 
    createDocument, 
    switchDocument, 
    deleteDocument,
    updateDocumentTitle,
    updateInputContent
  } = useDocumentStore()
  
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const { showNotification } = useNotification()

  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editingId])

  const handleDoubleClick = (doc: typeof documents[0]) => {
    setEditingId(doc.id)
    setEditTitle(doc.title)
  }

  const handleTitleSubmit = () => {
    if (editingId && editTitle.trim()) {
      updateDocumentTitle(editingId, editTitle.trim())
    }
    setEditingId(null)
  }

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTitleSubmit()
    } else if (e.key === 'Escape') {
      setEditingId(null)
    }
  }

  const handleClose = (e: React.MouseEvent, docId: string) => {
    e.stopPropagation()
    deleteDocument(docId)
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
        showNotification({
          type: 'success',
          message: 'JSON content pasted to new document!'
        })
      } catch {
        // If not valid JSON, still paste it
        updateInputContent(newDocId, text)
        showNotification({
          type: 'info',
          message: 'Content pasted to new document (not valid JSON)'
        })
      }
      
      // Paste successful
    } catch (error) {
      showNotification({
        type: 'error',
        message: 'Failed to paste from clipboard'
      })
    }
  }

  return (
    <div className="document-tabs">
      <div className="tabs-container">
        {documents.map((doc) => (
          <div
            key={doc.id}
            className={clsx('document-tab', { 
              active: doc.id === currentDocId 
            })}
            onClick={() => switchDocument(doc.id)}
            onDoubleClick={() => handleDoubleClick(doc)}
          >
            {editingId === doc.id ? (
              <input
                ref={inputRef}
                className="tab-title-input"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onBlur={handleTitleSubmit}
                onKeyDown={handleTitleKeyDown}
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span className="tab-title">{doc.title}</span>
            )}
            
            {documents.length > 1 && (
              <button
                className="tab-close"
                onClick={(e) => handleClose(e, doc.id)}
                aria-label="Close document"
              >
                ×
              </button>
            )}
          </div>
        ))}
        
        <button
          className="tab-add"
          onClick={createDocument}
          aria-label="New document"
          title="New blank document"
        >
          +
        </button>
        
        <button
          onClick={handlePaste}
          aria-label="Paste from clipboard"
          title="New document from clipboard"
          style={{ 
            width: 'auto', 
            height: '26px',
            padding: '0 12px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            marginLeft: '8px',
            borderRadius: '4px',
            border: '1px solid rgba(102, 126, 234, 0.3)',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: '500',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            transition: 'all 0.3s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.05)';
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(102, 126, 234, 0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          📋 Paste
        </button>
      </div>
    </div>
  )
}