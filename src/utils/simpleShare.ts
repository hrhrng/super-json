import LZString from 'lz-string'

export function createShareUrl(inputContent: string): { url: string; length: number } {
  // Compress only the input content
  const compressed = LZString.compressToEncodedURIComponent(inputContent)
  
  // Create share URL
  const baseUrl = window.location.origin + window.location.pathname
  const shareUrl = `${baseUrl}?s=${compressed}`
  
  return {
    url: shareUrl,
    length: shareUrl.length
  }
}

export function importFromUrl(compressedData: string): string {
  try {
    // Decompress the data
    const inputContent = LZString.decompressFromEncodedURIComponent(compressedData)
    
    if (!inputContent) {
      throw new Error('Invalid share link: Unable to decompress data')
    }
    
    return inputContent
  } catch (error) {
    console.error('Error importing from URL:', error)
    throw new Error('Failed to import shared content. Please check the link and try again.')
  }
}

export function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text)
  } else {
    // Fallback for older browsers
    return new Promise((resolve, reject) => {
      const textArea = document.createElement('textarea')
      textArea.value = text
      textArea.style.position = 'fixed'
      textArea.style.left = '-999999px'
      textArea.style.top = '-999999px'
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      
      try {
        document.execCommand('copy')
        resolve()
      } catch (error) {
        reject(error)
      } finally {
        textArea.remove()
      }
    })
  }
}