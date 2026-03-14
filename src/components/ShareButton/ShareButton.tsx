import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { createShareUrl, copyToClipboard } from '@utils/simpleShare'


interface ShareButtonProps {
  getContent: () => string | undefined
  onNotification: (type: 'success' | 'error', message: string) => void
}

export function ShareButton({ getContent, onNotification }: ShareButtonProps) {
  const [sharing, setSharing] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [showNameInput, setShowNameInput] = useState(false)
  const [tabName, setTabName] = useState('')
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 })
  const buttonRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout>>()

  const updatePosition = useCallback(() => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setDropdownPos({ top: rect.bottom + 2, left: rect.left })
    }
  }, [])

  useEffect(() => {
    if (!showDropdown) return
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      if (
        buttonRef.current && !buttonRef.current.contains(target) &&
        dropdownRef.current && !dropdownRef.current.contains(target)
      ) {
        setShowDropdown(false)
        setShowNameInput(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showDropdown])

  const handleShare = async (customTabName?: string) => {
    const content = getContent()
    if (!content) return

    setSharing(true)
    try {
      const result = await createShareUrl(content, customTabName || undefined)
      await copyToClipboard(result.url)
      onNotification('success', `Share link copied! (${result.length} chars)`)
    } catch (error) {
      onNotification('error', error instanceof Error ? error.message : 'Failed to create share link')
    } finally {
      setSharing(false)
      setShowDropdown(false)
      setShowNameInput(false)
      setTabName('')
    }
  }

  const handleMouseEnter = () => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current)
      hideTimeoutRef.current = undefined
    }
    updatePosition()
    setShowDropdown(true)
  }

  const handleMouseLeave = () => {
    hideTimeoutRef.current = setTimeout(() => {
      if (!showNameInput) {
        setShowDropdown(false)
      }
    }, 200)
  }

  const handleDropdownMouseEnter = () => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current)
      hideTimeoutRef.current = undefined
    }
  }

  const handleDropdownMouseLeave = () => {
    hideTimeoutRef.current = setTimeout(() => {
      if (!showNameInput) {
        setShowDropdown(false)
      }
    }, 200)
  }

  const handleNameSubmit = () => {
    if (tabName.trim()) {
      handleShare(tabName.trim())
    }
  }

  return (
    <>
      <button
        ref={buttonRef}
        className="tool-btn"
        onClick={() => handleShare()}
        disabled={sharing}
        title="Copy share link"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {sharing ? '⏳' : 'Share'}
      </button>
      {showDropdown && !sharing && createPortal(
        <div
          ref={dropdownRef}
          onMouseEnter={handleDropdownMouseEnter}
          onMouseLeave={handleDropdownMouseLeave}
          style={{
            position: 'fixed',
            top: dropdownPos.top,
            left: dropdownPos.left,
            background: 'var(--bg-panel)',
            border: '1px solid var(--border)',
            borderRadius: '4px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
            zIndex: 10000,
            minWidth: showNameInput ? '220px' : '110px',
            padding: '4px',
          }}
        >
          {!showNameInput ? (
            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowNameInput(true)
              }}
              style={{
                display: 'block',
                width: '100%',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-secondary)',
                padding: '6px 8px',
                cursor: 'pointer',
                fontSize: '11px',
                fontFamily: 'JetBrains Mono, monospace',
                textAlign: 'left',
                borderRadius: '2px',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(31, 182, 255, 0.1)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
              }}
            >
              with name...
            </button>
          ) : (
            <div style={{ display: 'flex', gap: '4px', padding: '2px' }}>
              <input
                type="text"
                value={tabName}
                onChange={(e) => setTabName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleNameSubmit()
                  if (e.key === 'Escape') {
                    setShowNameInput(false)
                    setShowDropdown(false)
                  }
                }}
                placeholder="Tab name"
                autoFocus
                style={{
                  flex: 1,
                  background: 'var(--bg-main)',
                  border: '1px solid var(--border)',
                  borderRadius: '2px',
                  color: 'var(--text-primary)',
                  padding: '4px 6px',
                  fontSize: '11px',
                  fontFamily: 'JetBrains Mono, monospace',
                  outline: 'none',
                  minWidth: 0,
                }}
              />
              <button
                onClick={handleNameSubmit}
                disabled={!tabName.trim()}
                style={{
                  background: 'rgba(31, 182, 255, 0.2)',
                  border: '1px solid var(--border)',
                  borderRadius: '2px',
                  color: tabName.trim() ? 'var(--text-secondary)' : 'var(--text-dim)',
                  padding: '4px 8px',
                  cursor: tabName.trim() ? 'pointer' : 'default',
                  fontSize: '11px',
                  fontFamily: 'JetBrains Mono, monospace',
                  whiteSpace: 'nowrap',
                }}
              >
                OK
              </button>
            </div>
          )}
        </div>,
        document.body
      )}
    </>
  )
}
