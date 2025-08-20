import * as monaco from 'monaco-editor'

export function defineCustomTheme() {
  monaco.editor.defineTheme('superJSON', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'string.key.json', foreground: '00ffff' },  // Cyan
      { token: 'string.value.json', foreground: '8B5DFF' }, // Purple
      { token: 'number', foreground: '00ff88' },           // Neon green
      { token: 'keyword', foreground: 'ff0055' }           // Neon pink
    ],
    colors: {
      'editor.background': '#000000',
      'editor.foreground': '#1FB6FF',
      'editor.lineHighlightBackground': '#0a0a0a',
      'editorLineNumber.foreground': '#1FB6FF33',
      'editorIndentGuide.background': '#1FB6FF11',
      'editor.selectionBackground': '#1FB6FF22',
      'editorCursor.foreground': '#00ffff',
      'editorCursor.background': '#000000'
    }
  })
}