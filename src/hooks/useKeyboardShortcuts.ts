import { useEffect } from 'react'
import { useDocumentStore } from '@stores/documentStore'
import toast from 'react-hot-toast'

export function useKeyboardShortcuts() {
  const { createDocument, deleteDocument, currentDocId, documents, switchDocument } = useDocumentStore()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + T: New document
      if ((e.ctrlKey || e.metaKey) && e.key === 't') {
        e.preventDefault()
        createDocument()
        toast.success('New document created')
      }
      
      // Ctrl/Cmd + W: Close current document
      if ((e.ctrlKey || e.metaKey) && e.key === 'w') {
        e.preventDefault()
        if (currentDocId && documents.length > 1) {
          deleteDocument(currentDocId)
          toast.success('Document closed')
        }
      }
      
      // Ctrl/Cmd + Tab: Switch to next document
      if ((e.ctrlKey || e.metaKey) && e.key === 'Tab') {
        e.preventDefault()
        if (documents.length > 1) {
          const currentIndex = documents.findIndex(d => d.id === currentDocId)
          const nextIndex = (currentIndex + 1) % documents.length
          switchDocument(documents[nextIndex].id)
        }
      }
      
      // Ctrl/Cmd + Enter: Analyze (handled in component)
      // Ctrl/Cmd + S: Generate output (handled in component)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [createDocument, deleteDocument, currentDocId, documents, switchDocument])
}