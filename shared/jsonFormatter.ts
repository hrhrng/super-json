export type BestEffortMode = 'strict' | 'loose'

export interface BestEffortResult {
  output: string
  mode: BestEffortMode
  reason?: string
}

const EMPTY_RESULT: BestEffortResult = {
  output: '',
  mode: 'strict'
}

export function formatJsonBestEffort(input: string, indentSize = 2): BestEffortResult {
  if (!input.trim()) {
    return EMPTY_RESULT
  }

  try {
    const parsed = JSON.parse(input)
    const formatted = JSON.stringify(parsed, null, indentSize)
    return {
      output: formatted,
      mode: 'strict'
    }
  } catch (error) {
    return {
      output: formatJsonLoosely(input, indentSize),
      mode: 'loose',
      reason: error instanceof Error ? error.message : 'Unknown JSON parse error'
    }
  }
}

export function minifyJsonBestEffort(input: string): BestEffortResult {
  if (!input.trim()) {
    return EMPTY_RESULT
  }

  try {
    const parsed = JSON.parse(input)
    const minified = JSON.stringify(parsed)
    return {
      output: minified,
      mode: 'strict'
    }
  } catch (error) {
    return {
      output: minifyJsonLoosely(input),
      mode: 'loose',
      reason: error instanceof Error ? error.message : 'Unknown JSON parse error'
    }
  }
}

function isWhitespace(char: string): boolean {
  return char === ' ' || char === '\t' || char === '\n' || char === '\r'
}

function formatJsonLoosely(input: string, indentSize: number): string {
  const source = input.trim()
  if (!source) {
    return ''
  }

  const indentUnit = ' '.repeat(Math.max(indentSize, 0))
  let indentLevel = 0
  let newlinePending = false
  let inString = false
  let escaped = false
  let result = ''
  let lastSignificantChar = ''

  const appendIndent = () => {
    result += '\n' + indentUnit.repeat(Math.max(indentLevel, 0))
    lastSignificantChar = ''
  }

  const findNextNonWhitespace = (startIndex: number) => {
    for (let i = startIndex; i < source.length; i++) {
      const candidate = source[i]
      if (!isWhitespace(candidate)) {
        return candidate
      }
    }
    return ''
  }

  const shouldPreserveSpace = (prev: string, next: string) => {
    if (!prev || !next) return false
    if (isStructuralChar(prev) || isStructuralChar(next)) return false
    return true
  }

  for (let i = 0; i < source.length; i++) {
    const char = source[i]

    if (inString) {
      result += char
      if (escaped) {
        escaped = false
      } else if (char === '\\') {
        escaped = true
      } else if (char === '"') {
        inString = false
        lastSignificantChar = '"'
      }
      continue
    }

    if (char === '"') {
      if (newlinePending) {
        appendIndent()
        newlinePending = false
      }
      inString = true
      result += char
      lastSignificantChar = '"'
      continue
    }

    if (isWhitespace(char)) {
      const nextNonWhitespace = findNextNonWhitespace(i + 1)
      if (shouldPreserveSpace(lastSignificantChar, nextNonWhitespace) && !result.endsWith(' ')) {
        result += ' '
      }
      continue
    }

    if (char === '}' || char === ']') {
      indentLevel = Math.max(indentLevel - 1, 0)
      appendIndent()
      result += char
      newlinePending = true
      lastSignificantChar = char
      continue
    }

    if (newlinePending) {
      appendIndent()
      newlinePending = false
    }

    if (char === '{' || char === '[') {
      result += char
      indentLevel += 1
      newlinePending = true
      lastSignificantChar = char
      continue
    }

    if (char === ',') {
      result += char
      newlinePending = true
      lastSignificantChar = char
      continue
    }

    if (char === ':') {
      result += ': '
      lastSignificantChar = ':'
      continue
    }

    result += char
    lastSignificantChar = char
  }

  return result.trim()
}

function isStructuralChar(char: string): boolean {
  return char === '{' || char === '}' || char === '[' || char === ']' || char === ',' || char === ':'
}

function minifyJsonLoosely(input: string): string {
  const source = input.trim()
  if (!source) {
    return ''
  }

  let result = ''
  let inString = false
  let escaped = false
  let lastSignificantChar = ''

  const findNextNonWhitespace = (startIndex: number) => {
    for (let i = startIndex; i < source.length; i++) {
      const candidate = source[i]
      if (!isWhitespace(candidate)) {
        return candidate
      }
    }
    return ''
  }

  for (let i = 0; i < source.length; i++) {
    const char = source[i]

    if (inString) {
      result += char
      if (escaped) {
        escaped = false
      } else if (char === '\\') {
        escaped = true
      } else if (char === '"') {
        inString = false
        lastSignificantChar = '"'
      }
      continue
    }

    if (char === '"') {
      inString = true
      result += char
      lastSignificantChar = '"'
      continue
    }

    if (isWhitespace(char)) {
      const nextNonWhitespace = findNextNonWhitespace(i + 1)
      if (!isStructuralChar(lastSignificantChar) && !isStructuralChar(nextNonWhitespace) && lastSignificantChar && nextNonWhitespace) {
        result += ' '
      }
      continue
    }

    result += char
    lastSignificantChar = char
  }

  return result
}
