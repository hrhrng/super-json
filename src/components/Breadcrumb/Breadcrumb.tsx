import React, { useEffect, useMemo, useRef, useState } from 'react'
import { JSONLayer } from '../../types'

export type Crumb = {
  id: string
  label: string
  layerIndex: number
  depth: number
  parentField?: string | null
  children?: Crumb[]
}

type BreadcrumbProps = {
  layers: JSONLayer[]
  activeLayerIndex: number
  onSelectLayer: (index: number) => void
}

// Build tree structure from layers
function buildLayerTree(layers: JSONLayer[]): Crumb[] {
  if (!layers || layers.length === 0) return []

  const roots: Crumb[] = []
  const indexMap = new Map<number, Crumb>()

  // Create nodes
  layers.forEach((layer, index) => {
    const crumb: Crumb = {
      id: `layer-${index}`,
      label: layer.parentField || 'Root',
      layerIndex: index,
      depth: layer.depth,
      parentField: layer.parentField,
      children: []
    }
    indexMap.set(index, crumb)
  })

  // Link parent/children
  layers.forEach((layer, index) => {
    const crumb = indexMap.get(index)!
    if (layer.parentIndex === undefined || layer.parentIndex < 0) {
      roots.push(crumb)
    } else {
      const parent = indexMap.get(layer.parentIndex)
      if (parent) {
        parent.children = parent.children || []
        parent.children.push(crumb)
      } else {
        // Orphan fallback: treat as root to avoid runtime crash
        roots.push(crumb)
      }
    }
  })

  return roots
}

function useClickOutside(ref: React.RefObject<HTMLElement>, onOutside: () => void) {
  useEffect(() => {
    let armed = false
    const armTimer = setTimeout(() => { armed = true }, 0)
    
    const onClick = (e: MouseEvent) => {
      if (!ref.current) return
      if (!ref.current.contains(e.target as Node)) {
        if (!armed) return
        onOutside()
      }
    }
    
    document.addEventListener('mousedown', onClick)
    return () => {
      clearTimeout(armTimer)
      document.removeEventListener('mousedown', onClick)
    }
  }, [ref, onOutside])
}

// TreeMenu that can auto-expand to a target node id
const TreeMenu = ({
  nodes,
  targetId,
  onSelect,
  onClose,
}: {
  nodes: Crumb[]
  targetId?: string
  onSelect: (n: Crumb) => void
  onClose: () => void
}) => {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const boxRef = useRef<HTMLDivElement>(null)
  useClickOutside(boxRef, onClose)

  useEffect(() => {
    if (!targetId) return
    // Expand path to targetId
    const expandPath = (list: Crumb[], path: string[] = []): string[] | null => {
      for (const n of list) {
        if (n.id === targetId) return [...path, n.id]
        if (n.children) {
          const res = expandPath(n.children, [...path, n.id])
          if (res) return res
        }
      }
      return null
    }
    const path = expandPath(nodes)
    if (path) {
      const map: Record<string, boolean> = {}
      path.forEach(id => (map[id] = true))
      setExpanded(map)
    }
  }, [targetId, nodes])

  const toggle = (id: string) => setExpanded(s => ({ ...s, [id]: !s[id] }))

  const Row = ({ node, depth }: { node: Crumb; depth: number }) => {
    const hasChildren = node.children && node.children.length > 0
    const isExpanded = expanded[node.id]
    const isActive = targetId === node.id
    
    return (
      <div style={{ width: '100%' }}>
        <div
          className={`tree-row ${isActive ? 'active' : ''}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '4px 8px',
            paddingLeft: `${depth * 16 + 8}px`,
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '11px',
            color: isActive ? '#00ff88' : '#a8b2d1',
            backgroundColor: isActive ? 'rgba(0, 255, 136, 0.1)' : 'transparent',
            transition: 'all 0.15s'
          }}
          onMouseEnter={(e) => {
            if (!isActive) {
              e.currentTarget.style.backgroundColor = 'rgba(31, 182, 255, 0.08)'
              e.currentTarget.style.color = '#1FB6FF'
            }
          }}
          onMouseLeave={(e) => {
            if (!isActive) {
              e.currentTarget.style.backgroundColor = 'transparent'
              e.currentTarget.style.color = '#a8b2d1'
            }
          }}
          onClick={() => {
            onSelect(node)
            onClose()
          }}
        >
          {hasChildren ? (
            <button
              style={{
                padding: '0',
                width: '14px',
                height: '14px',
                background: 'transparent',
                border: 'none',
                color: 'rgba(31, 182, 255, 0.6)',
                cursor: 'pointer',
                fontSize: '10px',
                transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                transition: 'transform 0.1s',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              onClick={(e) => {
                e.stopPropagation()
                toggle(node.id)
              }}
            >
              ▸
            </button>
          ) : (
            <span style={{ display: 'inline-block', width: '14px' }} />
          )}

          <span
            style={{
              color: '#1FB6FF',
              fontSize: '10px',
              marginRight: '6px',
              fontWeight: 600,
              letterSpacing: '0.5px',
              minWidth: '20px'
            }}
          >
            L{node.depth + 1}
          </span>

          <span style={{ flex: 1 }}>
            {node.label}
          </span>
        </div>
        {hasChildren && isExpanded && (
          <div style={{ width: '100%' }}>
            {node.children!.map(child => (
              <Row key={child.id} node={child} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      ref={boxRef}
      onMouseDown={(e) => e.stopPropagation()}
      style={{
        position: 'absolute',
        left: 0,
        top: 'calc(100% + 4px)',
        zIndex: 10000,
        maxHeight: '400px',
        width: '320px',
        overflow: 'auto',
        borderRadius: '8px',
        border: '1px solid rgba(31, 182, 255, 0.3)',
        backgroundColor: 'rgba(10, 10, 10, 0.98)',
        padding: '4px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.8), 0 0 20px rgba(31, 182, 255, 0.1)',
        backdropFilter: 'blur(10px)'
      }}
    >
      {nodes.map(n => (
        <Row key={n.id} node={n} depth={0} />
      ))}
    </div>
  )
}

export function Breadcrumb({ layers, activeLayerIndex, onSelectLayer }: BreadcrumbProps) {
  const [menuOpenAt, setMenuOpenAt] = useState<number | null>(null)
  const [showChildrenMenu, setShowChildrenMenu] = useState(false)

  const layerTree = useMemo(() => buildLayerTree(layers), [layers])
  
  // Get children of current layer
  const currentLayerChildren = useMemo(() => {
    if (!layers || activeLayerIndex < 0 || activeLayerIndex >= layers.length) return []
    
    // Find all layers that have current layer as parent
    return layers
      .map((layer, index) => ({ layer, index }))
      .filter(({ layer }) => layer.parentIndex === activeLayerIndex)
      .map(({ layer, index }) => ({
        id: `child-${index}`,
        label: layer.parentField || `Layer ${layer.depth}`,
        layerIndex: index,
        depth: layer.depth,
        parentField: layer.parentField
      }))
  }, [layers, activeLayerIndex])

  // Build breadcrumb path from root to current layer
  const breadcrumbItems = useMemo(() => {
    if (!layers || layers.length === 0) return []

    const items: Crumb[] = []
    let currentIndex = activeLayerIndex

    // path from current to root
    const pathIndices: number[] = []
    while (currentIndex >= 0) {
      pathIndices.unshift(currentIndex)
      const layer = layers[currentIndex]
      currentIndex = layer?.parentIndex !== undefined ? layer.parentIndex ?? -1 : -1
    }

    // convert
    pathIndices.forEach(layerIndex => {
      const layer = layers[layerIndex]
      items.push({
        id: `layer-${layerIndex}`,
        label: layer.parentField || 'Root',
        layerIndex,
        depth: layer.depth,
        parentField: layer.parentField
      })
    })

    return items
  }, [layers, activeLayerIndex])

  const handleLayerSelect = (node: Crumb) => {
    onSelectLayer(node.layerIndex)
    setMenuOpenAt(null)
  }
  
  // Close children menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (showChildrenMenu && !target.closest('.children-menu-container')) {
        setShowChildrenMenu(false)
      }
    }
    
    if (showChildrenMenu) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [showChildrenMenu])

  // Simple version with better styles
  return (
    <div style={{ 
      padding: '4px 12px', 
      backgroundColor: 'rgba(10, 10, 10, 0.95)', 
      borderBottom: '1px solid rgba(31, 182, 255, 0.1)',
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      fontSize: '11px',
      fontFamily: 'JetBrains Mono, monospace'
    }}>
      {breadcrumbItems.map((item, index) => {
        const isLast = index === breadcrumbItems.length - 1
        const isOpen = menuOpenAt === index
        
        return (
          <span key={item.id} style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
            <button
              onClick={() => {
                console.log('Breadcrumb clicked:', item.label, index)
                setMenuOpenAt(menuOpenAt === index ? null : index)
              }}
              className={`breadcrumb-item ${isLast ? 'active' : ''} ${isOpen ? 'dropdown-open' : ''}`}
              style={{
                fontSize: '11px',
                fontFamily: 'inherit'
              }}
            >
              {item.label}
            </button>
            
            {isOpen && (
              <TreeMenu
                nodes={layerTree}
                targetId={item.id}
                onSelect={handleLayerSelect}
                onClose={() => setMenuOpenAt(null)}
              />
            )}
            
            {!isLast && (
              <span className="breadcrumb-separator">
                →
              </span>
            )}
          </span>
        )
      })}
      
      {/* Show expandable button if current layer has children */}
      {currentLayerChildren.length > 0 && (
        <>
          <span className="breadcrumb-separator">
            →
          </span>
          <span className="children-menu-container" style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
            <button
              onClick={() => setShowChildrenMenu(!showChildrenMenu)}
              className={`breadcrumb-item ${showChildrenMenu ? 'dropdown-open' : ''}`}
              style={{
                fontSize: '11px',
                fontFamily: 'inherit',
                fontWeight: '600'
              }}
              title={`${currentLayerChildren.length} nested layer${currentLayerChildren.length > 1 ? 's' : ''}`}
            >
              +{currentLayerChildren.length}
            </button>
            
            {showChildrenMenu && (
              <div style={{
                position: 'absolute',
                top: 'calc(100% + 4px)',
                left: 0,
                backgroundColor: 'rgba(10, 10, 10, 0.98)',
                border: '1px solid rgba(31, 182, 255, 0.3)',
                borderRadius: '8px',
                zIndex: 10000,
                minWidth: '200px',
                maxHeight: '350px',
                overflow: 'auto',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.8), 0 0 20px rgba(31, 182, 255, 0.1)',
                padding: '4px'
              }}>
                <div style={{
                  fontSize: '10px',
                  color: 'rgba(31, 182, 255, 0.7)',
                  padding: '4px 8px',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  borderBottom: '1px solid rgba(31, 182, 255, 0.2)',
                  marginBottom: '4px'
                }}>
                  Nested Layers
                </div>
                {currentLayerChildren.map((child) => (
                  <button
                    key={child.id}
                    onClick={() => {
                      onSelectLayer(child.layerIndex)
                      setShowChildrenMenu(false)
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      width: '100%',
                      textAlign: 'left',
                      padding: '6px 8px',
                      backgroundColor: 'transparent',
                      color: '#a8b2d1',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '11px',
                      fontFamily: 'inherit',
                      transition: 'all 0.2s',
                      gap: '8px'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(31, 182, 255, 0.08)'
                      e.currentTarget.style.color = '#1FB6FF'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent'
                      e.currentTarget.style.color = '#a8b2d1'
                    }}
                  >
                    <span style={{
                      fontSize: '9px',
                      color: 'rgba(31, 182, 255, 0.5)',
                      fontWeight: '600'
                    }}>
                      L{child.depth}
                    </span>
                    <span>{child.label}</span>
                  </button>
                ))}
              </div>
            )}
          </span>
        </>
      )}
    </div>
  )
}