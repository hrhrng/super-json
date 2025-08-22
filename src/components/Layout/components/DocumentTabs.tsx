import { useState, useEffect, useRef } from 'react'
import { useDocumentStore } from '@stores/documentStore'
import { showNotification } from '@components/Notification/Notification'

export function DocumentTabs() {
  const { 
    documents,
    currentDocId,
    createDocument,
    deleteDocument,
    switchDocument,
    updateDocumentTitle,
    updateInputContent,
    reorderDocuments
  } = useDocumentStore()

  const [editingDocId, setEditingDocId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [showPasteButton, setShowPasteButton] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus input when editing doc title
  useEffect(() => {
    if (editingDocId && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editingDocId])

  const handleDoubleClickTab = (doc: typeof documents[0]) => {
    setEditingDocId(doc.id)
    setEditTitle(doc.title)
  }

  const handleTitleSubmit = () => {
    if (editingDocId && editTitle.trim()) {
      updateDocumentTitle(editingDocId, editTitle.trim())
    }
    setEditingDocId(null)
  }

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTitleSubmit()
    } else if (e.key === 'Escape') {
      setEditingDocId(null)
    }
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
        showNotification('JSON content pasted to new document!', 'success')
      } catch {
        // If not valid JSON, still paste it
        updateInputContent(newDocId, text)
        showNotification('Content pasted to new document (not valid JSON)', 'info')
      }
    } catch (error) {
      showNotification('Failed to paste from clipboard', 'error')
    }
  }

  // Drag and drop handlers
  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    setDragOverIndex(index)
  }

  const handleDragLeave = () => {
    setDragOverIndex(null)
  }

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    if (draggedIndex !== null && draggedIndex !== dropIndex) {
      reorderDocuments(draggedIndex, dropIndex)
    }
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  return (
    <div className="tabs">
      {documents.map((doc, index) => (
        <div 
          key={doc.id}
          className={`tab ${doc.id === currentDocId ? 'active' : ''} ${dragOverIndex === index ? 'drag-over' : ''}`}
          onClick={() => switchDocument(doc.id)}
          onDoubleClick={() => handleDoubleClickTab(doc)}
          draggable={!editingDocId}
          onDragStart={() => handleDragStart(index)}
          onDragOver={(e) => handleDragOver(e, index)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, index)}
          onDragEnd={handleDragEnd}
          style={{
            opacity: draggedIndex === index ? 0.5 : 1,
            cursor: editingDocId ? 'text' : 'move'
          }}
        >
          {editingDocId === doc.id ? (
            <input
              ref={inputRef}
              className="tab-title-input"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={handleTitleSubmit}
              onKeyDown={handleTitleKeyDown}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: 'inherit',
                font: 'inherit',
                padding: 0,
                margin: 0,
                width: '100px'
              }}
            />
          ) : (
            <span>{doc.title}</span>
          )}
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
      <div 
        style={{ display: 'inline-flex', alignItems: 'center' }}
        onMouseEnter={() => setShowPasteButton(true)}
        onMouseLeave={() => setShowPasteButton(false)}
      >
        <button className="tab-add" onClick={createDocument}>+</button>
        {showPasteButton && (
          <button
            onClick={handlePaste}
            aria-label="Paste from clipboard"
            title="New document from clipboard"
            style={{ 
              height: '26px',
              padding: '0 10px',
              background: 'rgba(31, 182, 255, 0.05)',
              color: 'var(--text-dim)',
              marginLeft: '6px',
              borderRadius: '4px',
              border: '1px solid var(--border)',
              cursor: 'pointer',
              fontSize: '11px',
              fontWeight: '400',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              animation: 'slideInFromLeft 0.2s ease-out',
              transition: 'all 0.2s',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(31, 182, 255, 0.1)';
              e.currentTarget.style.color = 'var(--text-secondary)';
              e.currentTarget.style.borderColor = 'var(--text-secondary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(31, 182, 255, 0.05)';
              e.currentTarget.style.color = 'var(--text-dim)';
              e.currentTarget.style.borderColor = 'var(--border)';
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}