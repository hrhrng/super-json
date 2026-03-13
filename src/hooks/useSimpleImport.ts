import { useEffect, useRef } from 'react'
import { useDocumentStore } from '@stores/documentStore'
import { useAppStore } from '@stores/appStore'
import { importFromUrl, importFromBase64Url, importFromCompressedUrl } from '@utils/simpleShare'
import { useNotification } from '@components/Notification/Notification'

// Track if import has been processed globally to prevent duplicates
let isImportProcessed = false

export function useSimpleImport() {
  const { createDocument, updateInputContent, updateDocumentTitle, switchDocument, updateHeroUrl } = useDocumentStore()
  const { setViewMode } = useAppStore()
  const { showNotification } = useNotification()
  const hasImportedRef = useRef(false)

  useEffect(() => {
    const handleImport = async () => {
      // Check URL parameters for shared data
      const urlParams = new URLSearchParams(window.location.search)
      const compressedData = urlParams.get('s') // 's' for share (LZ-String compressed)
      const rawBase64Data = urlParams.get('r') // 'r' for raw (base64url encoded)
      const gzipBase64Data = urlParams.get('c') // 'c' for compressed (gzip + base64url)
      const tabName = urlParams.get('t') // 't' for tab name
      const heroMode = urlParams.get('h') // 'h' for hero mode (auto load → hero)

      // Check both local ref and global flag to prevent duplicates
      if ((!compressedData && !rawBase64Data && !gzipBase64Data) || hasImportedRef.current || isImportProcessed) return
      
      hasImportedRef.current = true
      isImportProcessed = true
      
      // Small delay to ensure store is initialized
      await new Promise(resolve => setTimeout(resolve, 100))
      
      try {
        showNotification({
          type: 'info',
          message: 'Importing shared content to new tab...'
        })
        
        const inputContent = compressedData
          ? importFromUrl(compressedData)
          : gzipBase64Data
            ? await importFromCompressedUrl(gzipBase64Data)
            : importFromBase64Url(rawBase64Data!)
        
        // Create a new document with the imported content
        const docId = createDocument()
        
        // Small delay to ensure document is created
        await new Promise(resolve => setTimeout(resolve, 50))
        
        updateInputContent(docId, inputContent)
        
        // Use custom tab name if provided, otherwise try to parse JSON for a title
        if (tabName) {
          updateDocumentTitle(docId, decodeURIComponent(tabName))
        } else {
          try {
            const parsed = JSON.parse(inputContent)
            const title = parsed.title || parsed.name || 'Shared Document'
            updateDocumentTitle(docId, title)
          } catch {
            updateDocumentTitle(docId, 'Shared Document')
          }
        }
        
        // Switch to the new document
        switchDocument(docId)

        // Auto-switch to hero mode and load into JSON Hero if h=1
        if (heroMode === '1') {
          setViewMode('hero')
          try {
            const parsed = JSON.parse(inputContent)
            const docTitle = tabName ? decodeURIComponent(tabName) : 'JSON Document'
            const response = await fetch('https://jsonhero.io/api/create.json', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                title: docTitle,
                content: parsed,
                readOnly: false,
                ttl: 86400
              })
            })
            if (response.ok) {
              const data = await response.json()
              updateHeroUrl(docId, data.location)
            }
          } catch {
            // Hero loading failed silently, user can manually click Load → Hero
          }
        }

        showNotification({
          type: 'success',
          message: heroMode === '1' ? 'Shared content loaded into Hero view' : 'Shared content imported to new tab'
        })
        
        // Clean up the URL
        const newUrl = new URL(window.location.href)
        newUrl.searchParams.delete('s')
        newUrl.searchParams.delete('r')
        newUrl.searchParams.delete('c')
        newUrl.searchParams.delete('t')
        newUrl.searchParams.delete('h')
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