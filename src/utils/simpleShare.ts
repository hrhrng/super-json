import LZString from 'lz-string'

export function createShareUrl(inputContent: string, tabName?: string): { url: string; length: number } {
  // Compress only the input content
  const compressed = LZString.compressToEncodedURIComponent(inputContent)

  // Create share URL
  const baseUrl = window.location.origin + window.location.pathname
  let shareUrl = `${baseUrl}?s=${compressed}`

  // Add tab name parameter if provided
  if (tabName) {
    shareUrl += `&t=${encodeURIComponent(tabName)}`
  }

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

export function importFromBase64Url(base64Data: string): string {
  try {
    // Convert base64url to standard base64
    let base64 = base64Data.replace(/-/g, '+').replace(/_/g, '/')
    // Add padding if needed
    while (base64.length % 4 !== 0) {
      base64 += '='
    }
    const inputContent = decodeURIComponent(escape(atob(base64)))

    if (!inputContent) {
      throw new Error('Invalid share link: Unable to decode data')
    }

    return inputContent
  } catch (error) {
    console.error('Error importing from base64 URL:', error)
    throw new Error('Failed to import shared content. Please check the link and try again.')
  }
}

export async function importFromCompressedUrl(compressedData: string): Promise<string> {
  try {
    // Convert base64url to standard base64
    let base64 = compressedData.replace(/-/g, '+').replace(/_/g, '/')
    while (base64.length % 4 !== 0) {
      base64 += '='
    }

    // Decode base64 to binary
    const binString = atob(base64)
    const bytes = new Uint8Array(binString.length)
    for (let i = 0; i < binString.length; i++) {
      bytes[i] = binString.charCodeAt(i)
    }

    // Decompress gzip using DecompressionStream API
    const ds = new DecompressionStream('gzip')
    const writer = ds.writable.getWriter()
    writer.write(bytes)
    writer.close()

    const reader = ds.readable.getReader()
    const chunks: Uint8Array[] = []
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(value)
    }

    // Concatenate chunks and decode as UTF-8
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
    const result = new Uint8Array(totalLength)
    let offset = 0
    for (const chunk of chunks) {
      result.set(chunk, offset)
      offset += chunk.length
    }

    const inputContent = new TextDecoder().decode(result)
    if (!inputContent) {
      throw new Error('Invalid share link: Unable to decompress data')
    }

    return inputContent
  } catch (error) {
    console.error('Error importing from compressed URL:', error)
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