import { useEffect, useRef } from 'react'
import { useDocumentStore } from '@stores/documentStore'
import { importFromUrl } from '@utils/simpleShare'
import { useNotification } from '@components/Notification/Notification'

// Track if import has been processed globally to prevent duplicates
let isImportProcessed = false

export function useSimpleImport() {
  const { createDocument, updateInputContent, updateDocumentTitle, switchDocument } = useDocumentStore()
  const { showNotification } = useNotification()
  const hasImportedRef = useRef(false)

  useEffect(() => {
    const handleImport = async () => {
      // Check URL parameters for compressed data
      const urlParams = new URLSearchParams(window.location.search)
      const compressedData = urlParams.get('s') // 's' for share
      
      // Check both local ref and global flag to prevent duplicates
      if (!compressedData || hasImportedRef.current || isImportProcessed) return
      
      hasImportedRef.current = true
      isImportProcessed = true
      
      // Small delay to ensure store is initialized
      await new Promise(resolve => setTimeout(resolve, 100))
      
      try {
        showNotification({
          type: 'info',
          message: 'Importing shared content to new tab...'
        })
        
        const inputContent = importFromUrl(compressedData)
        
        // Create a new document with the imported content
        const docId = createDocument()
        
        // Small delay to ensure document is created
        await new Promise(resolve => setTimeout(resolve, 50))
        
        updateInputContent(docId, inputContent)
        
        // Try to parse JSON to get a title
        try {
          const parsed = JSON.parse(inputContent)
          const title = parsed.title || parsed.name || 'Shared Document'
          updateDocumentTitle(docId, title)
        } catch {
          updateDocumentTitle(docId, 'Shared Document')
        }
        
        // Switch to the new document
        switchDocument(docId)
        
        showNotification({
          type: 'success',
          message: 'Shared content imported to new tab'
        })
        
        // Clean up the URL
        const newUrl = new URL(window.location.href)
        newUrl.searchParams.delete('s')
        window.history.replaceState({}, '', newUrl.toString())
        
        // Reset the global flag after URL is cleaned
        setTimeout(() => {
          isImportProcessed = false
        }, 1000)
        
      } catch (error) {
        console.error('Import error:', error)
        showNotification({
          type: 'error',
          message: error instanceof Error ? error.message : 'Failed to import content'
        })
        // Reset on error too
        isImportProcessed = false
      }
    }
    
    // Delay initial execution to ensure app is fully loaded
    setTimeout(handleImport, 500)
  }, [])
}