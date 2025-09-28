import { JSONLayer } from '@/types'

export class JSONLayerAnalyzer {
  private maxDepth: number
  private layers: JSONLayer[]

  constructor(maxDepth = 10) {
    this.maxDepth = maxDepth
    this.layers = []
  }

  analyze(input: string): JSONLayer[] {
    this.layers = []
    
    try {
      const parsed = JSON.parse(input)
        
      // Add root layer
      this.layers.push({
        depth: 0,
        content: parsed,
        type: this.getType(parsed),
        parentField: null,
        hasChildren: false,
        parentIndex: -1,
        childIndices: []
      })
      
      // Scan for escaped JSON strings
      this.scanForEscapedJSON(parsed, 0, 0)
      
    } catch (error) {
      // If not valid JSON, treat as raw string
      this.layers.push({
        depth: 0,
        content: input,
        originalContent: input,
        type: 'string',
        isEscaped: false,
        parentIndex: -1,
        childIndices: []
      })
    }

    return this.layers
  }

  private scanForEscapedJSON(obj: any, currentDepth: number, parentIndex: number, path = ''): void {
    if (currentDepth >= this.maxDepth) return
    if (obj === null || typeof obj !== 'object') return
    
    if (Array.isArray(obj)) {
      obj.forEach((item, index) => {
        const itemPath = path ? `${path}[${index}]` : `[${index}]`
        if (typeof item === 'string' && this.isLikelyJSON(item)) {
          try {
            // Try parsing directly first
            let parsed = null
            try {
              parsed = JSON.parse(item)
            } catch {
              // If direct parse fails, try unescaping first
              const unescaped = this.tryUnescape(item)
              if (unescaped) {
                parsed = JSON.parse(unescaped)
              }
            }
            
            if (parsed && typeof parsed === 'object' && parsed !== null) {
              this.layers.push({
                depth: currentDepth + 1,
                content: parsed,
                originalContent: item,
                type: this.getType(parsed),
                parentField: itemPath,
                isEscaped: true,
                hasChildren: false,
                parentIndex: parentIndex,
                childIndices: []
              })
              
              const childIndex = this.layers.length - 1
              this.layers[parentIndex].childIndices = this.layers[parentIndex].childIndices || []
              this.layers[parentIndex].childIndices.push(childIndex)
              this.layers[parentIndex].hasChildren = true
              
              // Recursively scan the parsed content
              this.scanForEscapedJSON(parsed, currentDepth + 1, childIndex, '')
            }
          } catch (e) {
            // Not valid JSON
          }
        } else {
          this.scanForEscapedJSON(item, currentDepth, parentIndex, itemPath)
        }
      })
    } else {
      Object.entries(obj).forEach(([key, value]) => {
        const fieldPath = path ? `${path}.${key}` : key
        if (typeof value === 'string' && this.isLikelyJSON(value)) {
          try {
            // Try parsing directly first
            let parsed = null
            try {
              parsed = JSON.parse(value)
            } catch {
              // If direct parse fails, try unescaping first
              const unescaped = this.tryUnescape(value)
              if (unescaped) {
                parsed = JSON.parse(unescaped)
              }
            }
            
            if (parsed && typeof parsed === 'object' && parsed !== null) {
              this.layers.push({
                depth: currentDepth + 1,
                content: parsed,
                originalContent: value,
                type: this.getType(parsed),
                parentField: fieldPath,
                isEscaped: true,
                hasChildren: false,
                parentIndex: parentIndex,
                childIndices: []
              })
              
              const childIndex = this.layers.length - 1
              this.layers[parentIndex].childIndices = this.layers[parentIndex].childIndices || []
              this.layers[parentIndex].childIndices.push(childIndex)
              this.layers[parentIndex].hasChildren = true
              
              // Recursively scan the parsed content
              this.scanForEscapedJSON(parsed, currentDepth + 1, childIndex, '')
            }
          } catch (e) {
            // Not valid JSON
          }
        } else {
          this.scanForEscapedJSON(value, currentDepth, parentIndex, fieldPath)
        }
      })
    }
  }

  private isLikelyJSON(str: string): boolean {
    const trimmed = str.trim()
    // Check for regular JSON
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) ||
        (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      return true
    }
    
    // Check for escaped JSON (contains \" sequences)
    if (trimmed.includes('\\"') || trimmed.includes('\\\\')) {
      // Try to detect escaped JSON pattern
      const unescaped = this.tryUnescape(trimmed)
      if (unescaped && 
          ((unescaped.startsWith('{') && unescaped.endsWith('}')) ||
           (unescaped.startsWith('[') && unescaped.endsWith(']')))) {
        return true
      }
    }
    
    return false
  }
  
  private tryUnescape(str: string): string | null {
    try {
      // Try to unescape the string
      let unescaped = str
      // Replace escaped quotes
      unescaped = unescaped.replace(/\\"/g, '"')
      // Replace escaped backslashes
      unescaped = unescaped.replace(/\\\\/g, '\\')
      return unescaped
    } catch {
      return null
    }
  }

  rebuild(layers: JSONLayer[]): string {
    if (layers.length === 0) return '{}'
    
    // Clone layers to avoid mutating original
    const workingLayers = layers.map(l => ({
      ...l,
      content: typeof l.content === 'string' ? l.content : JSON.parse(JSON.stringify(l.content))
    }))
    
    // Rebuild from deepest to root
    for (let i = workingLayers.length - 1; i > 0; i--) {
      const currentLayer = workingLayers[i]
      const parentLayer = workingLayers[currentLayer.parentIndex!]
      
      if (!parentLayer) continue
      
      // Convert current layer back to string
      const jsonString = JSON.stringify(currentLayer.content)
      
      // Special handling for [parsed] field - replace entire parent content
      if (currentLayer.parentField === '[parsed]') {
        // The entire parent is an escaped JSON string
        parentLayer.content = currentLayer.content
      } else {
        // For regular fields, we need to completely replace the field value
        // not merge it, to avoid keeping old keys when keys are renamed
        this.setNestedValue(parentLayer.content, currentLayer.parentField!, jsonString)
      }
    }
    
    return JSON.stringify(workingLayers[0].content, null, 2)
  }

  private setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.match(/[^.\[\]]+/g) || []
    let current = obj
    
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i]
      const nextKey = keys[i + 1]
      const isArrayIndex = /^\d+$/.test(nextKey)
      
      if (!(key in current)) {
        current[key] = isArrayIndex ? [] : {}
      }
      current = current[key]
    }
    
    const lastKey = keys[keys.length - 1]
    current[lastKey] = value
  }

  private getType(data: any): 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null' {
    if (data === null) return 'null'
    if (Array.isArray(data)) return 'array'
    return typeof data as any
  }
}