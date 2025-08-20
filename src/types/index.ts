export interface JSONLayer {
  depth: number
  content: any
  originalContent?: string
  parentField?: string | null
  type: 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null'
  isEscaped?: boolean
  hasChildren?: boolean
  parentIndex?: number
  childIndices?: number[]
}

export interface Document {
  id: string
  title: string
  inputContent: string
  outputContent: string
  layers: JSONLayer[]
  createdAt: number
  updatedAt: number
  isActive: boolean
  heroUrl?: string
}

export interface EditorInstance {
  getValue: () => string
  setValue: (value: string) => void
  dispose: () => void
  layout: () => void
  focus: () => void
}

export interface LayerTab {
  id: string
  depth: number
  label: string
  content: string
  parentField?: string
  isActive: boolean
}

export interface AppState {
  documents: Document[]
  currentDocId: string | null
  isAnalyzing: boolean
  isGenerating: boolean
  autoSaveEnabled: boolean
  fontSize: number
  wordWrap: boolean
}

export type ViewMode = 'default' | 'minimal' | 'focus'

export interface NotificationOptions {
  message: string
  type: 'success' | 'error' | 'info' | 'warning'
  duration?: number
}