export type DiffType = 'added' | 'removed' | 'modified' | 'unchanged'

export interface DiffResult {
  path: string
  type: DiffType
  oldValue?: any
  newValue?: any
  children?: DiffResult[]
}

export interface DiffStats {
  added: number
  removed: number
  modified: number
  unchanged: number
}

function isObject(obj: any): boolean {
  return obj !== null && typeof obj === 'object' && !Array.isArray(obj)
}

function isArray(obj: any): boolean {
  return Array.isArray(obj)
}

function getType(value: any): string {
  if (value === null) return 'null'
  if (value === undefined) return 'undefined'
  if (Array.isArray(value)) return 'array'
  return typeof value
}

export function deepDiff(
  oldObj: any, 
  newObj: any, 
  path: string = 'root'
): DiffResult[] {
  const results: DiffResult[] = []
  
  // Both are equal
  if (oldObj === newObj) {
    return [{
      path,
      type: 'unchanged',
      oldValue: oldObj,
      newValue: newObj
    }]
  }
  
  // Type changed
  if (getType(oldObj) !== getType(newObj)) {
    return [{
      path,
      type: 'modified',
      oldValue: oldObj,
      newValue: newObj
    }]
  }
  
  // Handle objects
  if (isObject(oldObj) && isObject(newObj)) {
    const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)])
    
    for (const key of allKeys) {
      const childPath = `${path}.${key}`
      
      if (!(key in oldObj)) {
        // Added
        results.push({
          path: childPath,
          type: 'added',
          newValue: newObj[key]
        })
      } else if (!(key in newObj)) {
        // Removed
        results.push({
          path: childPath,
          type: 'removed',
          oldValue: oldObj[key]
        })
      } else {
        // Check for changes
        const childDiff = deepDiff(oldObj[key], newObj[key], childPath)
        results.push(...childDiff)
      }
    }
    
    return results
  }
  
  // Handle arrays
  if (isArray(oldObj) && isArray(newObj)) {
    const maxLength = Math.max(oldObj.length, newObj.length)
    
    for (let i = 0; i < maxLength; i++) {
      const childPath = `${path}[${i}]`
      
      if (i >= oldObj.length) {
        // Added
        results.push({
          path: childPath,
          type: 'added',
          newValue: newObj[i]
        })
      } else if (i >= newObj.length) {
        // Removed
        results.push({
          path: childPath,
          type: 'removed',
          oldValue: oldObj[i]
        })
      } else {
        // Check for changes
        const childDiff = deepDiff(oldObj[i], newObj[i], childPath)
        results.push(...childDiff)
      }
    }
    
    return results
  }
  
  // Primitive values
  if (oldObj !== newObj) {
    return [{
      path,
      type: 'modified',
      oldValue: oldObj,
      newValue: newObj
    }]
  }
  
  return [{
    path,
    type: 'unchanged',
    oldValue: oldObj,
    newValue: newObj
  }]
}

export function calculateDiffStats(diffs: DiffResult[]): DiffStats {
  const stats: DiffStats = {
    added: 0,
    removed: 0,
    modified: 0,
    unchanged: 0
  }
  
  for (const diff of diffs) {
    stats[diff.type]++
  }
  
  return stats
}

export function formatDiffLine(diff: DiffResult): string {
  const prefix = {
    added: '+',
    removed: '-',
    modified: '~',
    unchanged: ' '
  }[diff.type]
  
  const value = diff.type === 'removed' ? diff.oldValue : diff.newValue
  const formattedValue = typeof value === 'string' 
    ? `"${value}"`
    : JSON.stringify(value)
  
  return `${prefix} ${diff.path}: ${formattedValue}`
}

export function groupDiffsByParent(diffs: DiffResult[]): Map<string, DiffResult[]> {
  const grouped = new Map<string, DiffResult[]>()
  
  for (const diff of diffs) {
    const lastDot = diff.path.lastIndexOf('.')
    const lastBracket = diff.path.lastIndexOf('[')
    const splitPoint = Math.max(lastDot, lastBracket)
    
    const parent = splitPoint > 0 ? diff.path.substring(0, splitPoint) : 'root'
    
    if (!grouped.has(parent)) {
      grouped.set(parent, [])
    }
    grouped.get(parent)!.push(diff)
  }
  
  return grouped
}

// Create a unified diff view format
export function createUnifiedDiff(oldJson: any, newJson: any): string {
  const diffs = deepDiff(oldJson, newJson)
  const lines: string[] = []
  
  // Filter out unchanged items for cleaner view
  const significantDiffs = diffs.filter(d => d.type !== 'unchanged')
  
  if (significantDiffs.length === 0) {
    return 'No differences found'
  }
  
  // Group by parent for better readability
  const grouped = groupDiffsByParent(significantDiffs)
  
  for (const [parent, childDiffs] of grouped) {
    lines.push(`\n${parent}:`)
    for (const diff of childDiffs) {
      lines.push(`  ${formatDiffLine(diff)}`)
    }
  }
  
  return lines.join('\n')
}

// Generate side-by-side diff data for Monaco editor
export function generateSideBySideDiff(oldJson: any, newJson: any): {
  original: string
  modified: string
  decorations: any[]
} {
  const original = JSON.stringify(oldJson, null, 2)
  const modified = JSON.stringify(newJson, null, 2)
  
  const diffs = deepDiff(oldJson, newJson)
  const decorations: any[] = []
  
  // Create decorations for highlighting changes
  const significantDiffs = diffs.filter(d => d.type !== 'unchanged')
  
  // This would require line number calculation based on the path
  // For now, return basic structure
  significantDiffs.forEach(() => {
    // Future implementation
  })
  
  return {
    original,
    modified,
    decorations
  }
}