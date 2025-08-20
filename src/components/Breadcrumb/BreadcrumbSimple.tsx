import React, { useEffect, useRef, useState } from 'react'
import { JSONLayer } from '@types/index'

type BreadcrumbProps = {
  layers: JSONLayer[]
  activeLayerIndex: number
  onSelectLayer: (index: number) => void
}

// Simple dropdown showing all layers
function LayerDropdown({
  layers,
  activeIndex,
  onSelect,
  onClose,
}: {
  layers: JSONLayer[]
  activeIndex: number
  onSelect: (index: number) => void
  onClose: () => void
}) {
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  return (
    <div 
      ref={boxRef} 
      className="breadcrumb-dropdown"
      style={{
        // Positioned by outer wrapper; avoid nested fixed which breaks placement
        maxHeight: '400px',
        overflowY: 'auto',
        minWidth: '250px',
        maxWidth: '400px',
        // Ensure it's visible
        backgroundColor: 'rgba(10, 10, 10, 0.98)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.8), 0 0 80px rgba(31, 182, 255, 0.1)'
      }}
    >
      {layers.map((layer, index) => {
        const isActive = index === activeIndex
        const indent = layer.depth * 16
        
        return (
          <div
            key={index}
            className={`tree-row ${isActive ? 'active' : ''}`}
            style={{ paddingLeft: `${indent + 8}px` }}
            onClick={() => {
              onSelect(index)
              onClose()
            }}
          >
            <span style={{ 
              color: 'rgba(31, 182, 255, 0.4)', 
              fontSize: '9px', 
              marginRight: '6px',
              fontWeight: 600,
              letterSpacing: '0.5px'
            }}>
              L{layer.depth + 1}
            </span>
            <span>{layer.parentField || 'Root'}</span>
          </div>
        )
      })}
    </div>
  )
}

export function BreadcrumbSimple({ layers, activeLayerIndex, onSelectLayer }: BreadcrumbProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 })
  const breadcrumbRef = useRef<HTMLDivElement>(null)
  
  // Build breadcrumb path
  const breadcrumbPath = React.useMemo(() => {
    const path: number[] = []
    let currentIndex = activeLayerIndex
    
    while (currentIndex >= 0) {
      path.unshift(currentIndex)
      const layer = layers[currentIndex]
      currentIndex = layer?.parentIndex ?? -1
    }
    
    return path
  }, [layers, activeLayerIndex])

  const handleClick = (event: React.MouseEvent) => {
    event.stopPropagation()
    
    // Use the breadcrumb container's position for consistent positioning
    if (breadcrumbRef.current) {
      const rect = breadcrumbRef.current.getBoundingClientRect()
      setDropdownPosition({
        top: rect.bottom + 5,
        left: rect.left,
      })
      setDropdownOpen(!dropdownOpen)
    }
  }

  return (
    <div className="vscode-breadcrumb" ref={breadcrumbRef}>
      {breadcrumbPath.map((layerIndex, index) => {
        const layer = layers[layerIndex]
        const isLast = index === breadcrumbPath.length - 1
        
        return (
          <React.Fragment key={layerIndex}>
            <span
              className={`breadcrumb-item ${isLast ? 'active' : ''}`}
              onClick={handleClick}
              onMouseDown={(e) => e.preventDefault()}
              style={{ cursor: 'pointer' }}
            >
              {layer?.parentField || 'Root'}
            </span>
            {!isLast && <span className="breadcrumb-separator">→</span>}
          </React.Fragment>
        )
      })}

      {dropdownOpen && (
        <div style={{ 
          position: 'fixed', 
          top: dropdownPosition.top, 
          left: dropdownPosition.left,
          zIndex: 10001,  // Even higher than dropdown itself
          // Add pointer-events to ensure it's clickable
          pointerEvents: 'auto'
        }}>
          <LayerDropdown
            layers={layers}
            activeIndex={activeLayerIndex}
            onSelect={onSelectLayer}
            onClose={() => setDropdownOpen(false)}
          />
        </div>
      )}
    </div>
  )
}