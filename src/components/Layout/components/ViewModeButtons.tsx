import { useAppStore } from '@stores/appStore'

export function ViewModeButtons() {
  const { viewMode, setViewMode } = useAppStore()

  const modes = [
    {
      id: 'layer',
      label: 'LAYER',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="7" height="7"/>
          <rect x="14" y="3" width="7" height="7"/>
          <rect x="14" y="14" width="7" height="7"/>
          <rect x="3" y="14" width="7" height="7"/>
        </svg>
      )
    },
    {
      id: 'processor',
      label: 'TOOLS',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polyline>
        </svg>
      )
    },
    {
      id: 'hero',
      label: 'HERO',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"/>
        </svg>
      )
    },
    {
      id: 'diff',
      label: 'DIFF',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M16 2v20M8 2v20M3 12h18"/>
        </svg>
      )
    }
  ] as const

  return (
    <div className="sidebar">
      {modes.map(mode => (
        <button 
          key={mode.id}
          className={`mode-btn ${viewMode === mode.id ? 'active' : ''}`}
          onClick={() => setViewMode(mode.id as any)}
        >
          {mode.icon}
          <span className="mode-label">{mode.label}</span>
        </button>
      ))}
    </div>
  )
}