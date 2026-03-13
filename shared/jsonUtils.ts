export function formatJson(input: string, indent = 2): string {
  try {
    return JSON.stringify(JSON.parse(input), null, indent)
  } catch {
    return input
  }
}

export function minifyJson(input: string): string {
  try {
    return JSON.stringify(JSON.parse(input))
  } catch {
    return input
  }
}

export function escapeJson(input: string): string {
  return JSON.stringify(input)
}

export function unescapeJson(input: string): string {
  try {
    const result = JSON.parse(input)
    return typeof result === 'string' ? result : input
  } catch {
    return input.replace(/\\"/g, '"').replace(/\\\\/g, '\\')
  }
}
