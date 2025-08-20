import { useState, useRef, useEffect } from 'react'
import { useDocumentStore } from '@stores/documentStore'
import clsx from 'clsx'

export function DocumentTabs() {
  const { 
    documents, 
    currentDocId, 
    createDocument, 
    switchDocument, 
    deleteDocument,
    updateDocumentTitle 
  } = useDocumentStore()
  
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

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
        >
          +
        </button>
      </div>
    </div>
  )
}