import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { nanoid } from 'nanoid'
import { Document, JSONLayer } from '@types/index'

interface DocumentStore {
  documents: Document[]
  currentDocId: string | null
  
  // Actions
  createDocument: () => string
  deleteDocument: (id: string) => void
  switchDocument: (id: string) => void
  updateDocument: (id: string, updates: Partial<Document>) => void
  updateDocumentTitle: (id: string, title: string) => void
  updateInputContent: (id: string, content: string) => void
  updateOutputContent: (id: string, content: string) => void
  updateLayers: (id: string, layers: JSONLayer[]) => void
  updateLayer: (docId: string, layerIndex: number, content: string) => void
  
  // Persistence
  saveToLocalStorage: () => void
  loadFromLocalStorage: () => void
  
  // Getters
  getCurrentDocument: () => Document | null
}

const DEFAULT_DOCUMENT: Omit<Document, 'id' | 'createdAt' | 'updatedAt'> = {
  title: 'Untitled',
  inputContent: '',
  outputContent: '',
  layers: [],
  isActive: true,
}

export const useDocumentStore = create<DocumentStore>()(
  immer((set, get) => ({
    documents: [],
    currentDocId: null,

    createDocument: () => {
      const id = nanoid()
      const now = Date.now()
      
      const newDoc: Document = {
        ...DEFAULT_DOCUMENT,
        id,
        title: `Document ${get().documents.length + 1}`,
        createdAt: now,
        updatedAt: now,
      }

      set((state) => {
        state.documents.push(newDoc)
        state.currentDocId = id
      })

      get().saveToLocalStorage()
      return id
    },

    deleteDocument: (id) => {
      set((state) => {
        const index = state.documents.findIndex((d) => d.id === id)
        if (index !== -1) {
          state.documents.splice(index, 1)
          
          // Switch to another document if current was deleted
          if (state.currentDocId === id) {
            state.currentDocId = state.documents.length > 0 
              ? state.documents[0].id 
              : null
          }
        }
      })
      
      get().saveToLocalStorage()
    },

    switchDocument: (id) => {
      set((state) => {
        if (state.documents.find((d) => d.id === id)) {
          state.currentDocId = id
        }
      })
    },

    updateDocument: (id, updates) => {
      set((state) => {
        const doc = state.documents.find((d) => d.id === id)
        if (doc) {
          Object.assign(doc, updates, { updatedAt: Date.now() })
        }
      })
      
      get().saveToLocalStorage()
    },

    updateDocumentTitle: (id, title) => {
      get().updateDocument(id, { title })
    },

    updateInputContent: (id, content) => {
      get().updateDocument(id, { inputContent: content })
    },

    updateOutputContent: (id, content) => {
      get().updateDocument(id, { outputContent: content })
    },

    updateLayers: (id, layers) => {
      get().updateDocument(id, { layers })
    },

    updateLayer: (docId, layerIndex, content) => {
      set((state) => {
        const doc = state.documents.find((d) => d.id === docId)
        if (doc && doc.layers[layerIndex]) {
          try {
            doc.layers[layerIndex].content = JSON.parse(content)
            doc.updatedAt = Date.now()
          } catch {
            // If parse fails, keep as string
            doc.layers[layerIndex].content = content
            doc.updatedAt = Date.now()
          }
        }
      })
      
      get().saveToLocalStorage()
    },

    saveToLocalStorage: () => {
      const state = get()
      const data = {
        documents: state.documents,
        currentDocId: state.currentDocId,
      }
      localStorage.setItem('superJsonDocuments', JSON.stringify(data))
    },

    loadFromLocalStorage: () => {
      try {
        const stored = localStorage.getItem('superJsonDocuments')
        if (stored) {
          const data = JSON.parse(stored)
          set((state) => {
            state.documents = data.documents || []
            state.currentDocId = data.currentDocId || null
          })
        } else {
          // Create initial document if none exist
          get().createDocument()
        }
      } catch (error) {
        console.error('Failed to load from localStorage:', error)
        // Create initial document on error
        get().createDocument()
      }
    },

    getCurrentDocument: () => {
      const state = get()
      return state.documents.find((d) => d.id === state.currentDocId) || null
    },
  }))
)