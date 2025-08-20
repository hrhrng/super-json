import { create } from 'zustand'

type ViewMode = 'layer' | 'processor' | 'hero'

interface AppStore {
  viewMode: ViewMode
  isAnalyzing: boolean
  isGenerating: boolean
  activeLayerTab: number
  
  setViewMode: (mode: ViewMode) => void
  setAnalyzing: (analyzing: boolean) => void
  setGenerating: (generating: boolean) => void
  setActiveLayerTab: (tab: number) => void
  
  fontSize: number
  wordWrap: boolean
  autoSave: boolean
  
  setFontSize: (size: number) => void
  toggleWordWrap: () => void
  toggleAutoSave: () => void
  
  saveSettings: () => void
  loadSettings: () => void
}

export const useAppStore = create<AppStore>((set, get) => ({
  viewMode: 'layer',
  isAnalyzing: false,
  isGenerating: false,
  activeLayerTab: 0,
  
  setViewMode: (mode) => set({ viewMode: mode }),
  setAnalyzing: (analyzing) => set({ isAnalyzing: analyzing }),
  setGenerating: (generating) => set({ isGenerating: generating }),
  setActiveLayerTab: (tab) => set({ activeLayerTab: tab }),
  
  fontSize: 14,
  wordWrap: true,
  autoSave: true,
  
  setFontSize: (size) => {
    set({ fontSize: size })
    get().saveSettings()
  },
  
  toggleWordWrap: () => {
    set((state) => ({ wordWrap: !state.wordWrap }))
    get().saveSettings()
  },
  
  toggleAutoSave: () => {
    set((state) => ({ autoSave: !state.autoSave }))
    get().saveSettings()
  },
  
  saveSettings: () => {
    const { fontSize, wordWrap, autoSave } = get()
    const settings = { fontSize, wordWrap, autoSave }
    localStorage.setItem('superJsonSettings', JSON.stringify(settings))
  },
  
  loadSettings: () => {
    try {
      const stored = localStorage.getItem('superJsonSettings')
      if (stored) {
        const settings = JSON.parse(stored)
        set(settings)
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
    }
  },
}))