import React, { useState } from 'react'
import type { Shape } from '../types'
import { LIBRARY_SHAPES } from '../shapes/library'
import { TECH_ICONS } from '../shapes/icons'
import type { LibraryItem, BackgroundSettings } from '../types'

const FILL_COLORS = ['#1a1a2e', '#e53e3e', '#3182ce', '#38a169', '#d69e2e', '#805ad5']
const BG_COLORS = ['#faf9f6', '#f0ede8', '#e8e4dc', '#ffffff', '#1a1a2e', '#2d3748']

const SHORTCUTS = [
  ['V', 'Select'], ['F', 'Freehand'], ['R', 'Rectangle'], ['E', 'Ellipse'],
  ['A', 'Arrow'], ['L', 'Line'], ['T', 'Text'], ['X', 'Eraser'],
  ['Del', 'Delete'], ['Ctrl+Z', 'Undo'], ['Ctrl+Y', 'Redo'],
  ['Ctrl+A', 'Select All'], ['↑↓←→', 'Nudge 1px'], ['Shift+↑', 'Nudge 10px'],
]

interface Props {
  visible: boolean
  shapes: Shape[]
  selectedIds: string[]
  fillColor: string
  fontSize: number
  backgroundSettings: BackgroundSettings
  snapToGrid: boolean
  onSelectShape: (id: string) => void
  onDeleteShape: (id: string) => void
  onDeleteSelected: () => void
  onFillColor: (c: string) => void
  onFontSize: (s: number) => void
  onAddLibrary: (item: LibraryItem) => void
  onBackgroundSettings: (s: Partial<BackgroundSettings>) => void
  onSnapToGrid: (v: boolean) => void
}

export default function Sidebar({
  visible, shapes, selectedIds, fillColor, fontSize, backgroundSettings, snapToGrid,
  onSelectShape, onDeleteShape, onDeleteSelected,
  onFillColor, onFontSize, onAddLibrary, onBackgroundSettings, onSnapToGrid,
}: Props) {
  const [showLib, setShowLib] = useState(false)
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [search, setSearch] = useState('')

  const filteredIcons = React.useMemo(() => {
    if (!search.trim()) return [] // Don't show tech icons until searched to save performance
    const q = search.toLowerCase()
    return TECH_ICONS.filter(icon => icon.name.toLowerCase().includes(q)).slice(0, 60)
  }, [search])

  const filteredLibrary = React.useMemo(() => {
    const q = search.toLowerCase()
    return LIBRARY_SHAPES.filter(ls => ls.name.toLowerCase().includes(q))
  }, [search])

  if (!visible) return null

  return (
    <div style={{
      position: 'absolute', top: 0, right: 0, width: 252, height: '100vh',
      background: '#faf9f6', borderLeft: '2px solid #1a1a2e',
      boxShadow: '-3px 0 0 #1a1a2e',
      zIndex: 40, display: 'flex', flexDirection: 'column',
      fontFamily: "'Caveat', cursive",
    }}>

      {/* ── Style ── */}
      <div style={{ padding: '14px 14px 10px', borderBottom: '1px solid #e8e4dc' }}>
        <Label>Style</Label>
        <div style={{ display: 'flex', gap: 5, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, color: '#666', minWidth: 32 }}>Fill</span>
          {/* no fill */}
          <div onClick={() => onFillColor('none')} title="No fill" style={{
            width: 22, height: 22, borderRadius: 4, cursor: 'pointer',
            background: 'repeating-linear-gradient(45deg,#ddd 0,#ddd 2px,#fff 0,#fff 8px)',
            border: fillColor === 'none' ? '3px solid #3b82f6' : '2px solid #ccc',
          }} />
          {FILL_COLORS.map(c => (
            <div key={c} onClick={() => onFillColor(c)} style={{
              width: 22, height: 22, borderRadius: 4, background: c, cursor: 'pointer',
              border: fillColor === c ? '3px solid #3b82f6' : '2px solid rgba(0,0,0,0.15)',
            }} />
          ))}
          <input type="color" value={fillColor === 'none' ? '#ffffff' : fillColor}
            onChange={e => onFillColor(e.target.value)} style={{ width: 22, height: 22 }} />
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: '#666', minWidth: 32 }}>Font</span>
          <input type="range" min={12} max={72} step={2} value={fontSize}
            onChange={e => onFontSize(Number(e.target.value))} style={{ flex: 1 }} />
          <span style={{ fontSize: 12, color: '#888', minWidth: 22 }}>{fontSize}</span>
        </div>
      </div>

      {/* ── Layers ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 14px 4px' }}>
          <Label>Layers ({shapes.length})</Label>
          {selectedIds.length > 0 && (
            <button onClick={onDeleteSelected} style={{
              background: 'none', border: 'none', color: '#e53e3e', cursor: 'pointer', fontSize: 13
            }} title="Delete selected">✕ del</button>
          )}
        </div>
        <div style={{ overflowY: 'auto', flex: 1, paddingBottom: 4 }}>
          {shapes.length === 0 && (
            <p style={{ padding: '12px 14px', color: '#bbb', fontSize: 13, fontStyle: 'italic' }}>
              No shapes yet. Start drawing!
            </p>
          )}
          {[...shapes].reverse().map(s => (
            <div key={s.id} onClick={() => onSelectShape(s.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '5px 14px', cursor: 'pointer',
                background: selectedIds.includes(s.id) ? 'rgba(59,130,246,0.07)' : 'transparent',
                borderLeft: selectedIds.includes(s.id) ? '3px solid #3b82f6' : '3px solid transparent',
              }}>
              <div style={{
                width: 10, height: 10, borderRadius: 2, flexShrink: 0,
                background: s.strokeColor, border: '1px solid rgba(0,0,0,0.15)',
              }} />
              <span style={{ fontSize: 13, color: '#333', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {s.type === 'text'
                  ? `"${(s.text || '').slice(0, 14)}${(s.text?.length ?? 0) > 14 ? '…' : ''}"`
                  : s.type}
              </span>
              <button onClick={e => { e.stopPropagation(); onDeleteShape(s.id) }}
                style={{ background: 'none', border: 'none', color: '#ccc', cursor: 'pointer', fontSize: 11, padding: '0 2px' }}
                title="Remove">✕</button>
            </div>
          ))}
        </div>
      </div>

      {/* ── Background ── */}
      <div style={{ padding: '10px 14px', borderTop: '1px solid #e8e4dc', borderBottom: '1px solid #e8e4dc' }}>
        <Label>Background</Label>

        {/* Style selection */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
          <button
            onClick={() => onBackgroundSettings({ type: 'solid' })}
            className="sketchy-btn"
            style={{
              flex: 1, fontSize: 11, padding: '4px',
              background: backgroundSettings.type === 'solid' ? '#1a1a2e' : 'transparent',
              color: backgroundSettings.type === 'solid' ? '#fff' : '#1a1a2e'
            }}
          >Solid</button>
          <button
            onClick={() => onBackgroundSettings({ type: 'paper' })}
            className="sketchy-btn"
            style={{
              flex: 1, fontSize: 11, padding: '4px',
              background: backgroundSettings.type === 'paper' ? '#1a1a2e' : 'transparent',
              color: backgroundSettings.type === 'paper' ? '#fff' : '#1a1a2e'
            }}
          >Paper</button>
        </div>

        {/* Grid selection */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
          <span style={{ fontSize: 12, color: '#666', minWidth: 32 }}>Grid</span>
          <div style={{ display: 'flex', gap: 4, flex: 1 }}>
            {(['none', 'dot', 'line'] as const).map(g => (
              <button
                key={g}
                onClick={() => onBackgroundSettings({ grid: g })}
                className="sketchy-btn"
                style={{
                  flex: 1, fontSize: 10, padding: '2px 4px', textTransform: 'capitalize',
                  border: backgroundSettings.grid === g ? '2px solid #3b82f6' : '1px solid #1a1a2e'
                }}
              >{g}</button>
            ))}
          </div>
        </div>

        {/* BG Color selection */}
        <div style={{ display: 'flex', gap: 5, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: '#666', minWidth: 32 }}>Color</span>
          {BG_COLORS.map(c => (
            <div key={c} onClick={() => onBackgroundSettings({ color: c })} style={{
              width: 20, height: 20, borderRadius: 10, background: c, cursor: 'pointer',
              border: backgroundSettings.color === c ? '3px solid #3b82f6' : '2px solid rgba(0,0,0,0.15)',
            }} />
          ))}
          <input type="color" value={backgroundSettings.color}
            onChange={e => onBackgroundSettings({ color: e.target.value })} style={{ width: 20, height: 20 }} />
        </div>

        {/* Snap to grid */}
        <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type="checkbox"
            id="snap-toggle"
            checked={snapToGrid}
            onChange={e => onSnapToGrid(e.target.checked)}
            style={{ cursor: 'pointer' }}
          />
          <label htmlFor="snap-toggle" style={{ fontSize: 13, cursor: 'pointer', color: '#1a1a2e', fontWeight: 500 }}>
            Snap to Grid
          </label>
        </div>
      </div>

      {/* ── Library ── */}
      <div style={{ borderTop: '1px solid #e8e4dc' }}>
        <SectionToggle label="Library" open={showLib} onToggle={() => setShowLib(v => !v)} />
        {showLib && (
          <div style={{ padding: '0 10px 10px' }}>
            <input
              type="text"
              placeholder="Search icons..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%', padding: '6px 10px', marginBottom: 8,
                background: '#f0ede8', border: '1px solid #1a1a2e',
                borderRadius: 4, fontFamily: "'Caveat', cursive", fontSize: 13,
                outline: 'none', boxShadow: '2px 2px 0 rgba(0,0,0,0.1)'
              }}
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
              {filteredLibrary.map(ls => (
                <button key={ls.name} onClick={() => onAddLibrary(ls)} className="sketchy-btn"
                  style={{ padding: '5px 4px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                  {ls.imageUrl ? (
                    <img src={ls.imageUrl} alt={ls.name} style={{ width: 16, height: 16, objectFit: 'contain' }} />
                  ) : (
                    <span>{ls.icon}</span>
                  )}
                  <span>{ls.name}</span>
                </button>
              ))}

              {filteredIcons.map(icon => (
                <button key={icon.name} className="sketchy-btn"
                  onClick={() => onAddLibrary({
                    name: icon.name,
                    icon: '📦',
                    shapeType: 'image',
                    imageUrl: icon.url
                  })}
                  style={{ padding: '5px 4px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <img src={icon.url} alt={icon.name} style={{ width: 16, height: 16, objectFit: 'contain' }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {icon.name}
                  </span>
                </button>
              ))}
            </div>

            {!search && LIBRARY_SHAPES.length === 0 && (
              <p style={{ textAlign: 'center', color: '#999', fontSize: 12 }}>Search for 400+ tech icons...</p>
            )}
            {search && filteredLibrary.length === 0 && filteredIcons.length === 0 && (
              <p style={{ textAlign: 'center', color: '#999', fontSize: 12 }}>No icons found</p>
            )}
          </div>
        )}
      </div>

      {/* ── Shortcuts ── */}
      <div style={{ borderTop: '1px solid #e8e4dc' }}>
        <SectionToggle label="Shortcuts" open={showShortcuts} onToggle={() => setShowShortcuts(v => !v)} />
        {showShortcuts && (
          <div style={{ padding: '4px 14px 12px', fontSize: 12, color: '#555', lineHeight: 1.9 }}>
            {SHORTCUTS.map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between' }}>
                <kbd style={{ background: '#f0ede8', border: '1px solid #ccc', borderRadius: 3, padding: '0 4px', fontSize: 11 }}>{k}</kbd>
                <span>{v}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: 10, color: '#999', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
      {children}
    </p>
  )
}

function SectionToggle({ label, open, onToggle }: { label: string; open: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle} style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      width: '100%', padding: '8px 14px', background: 'none', border: 'none',
      cursor: 'pointer', fontFamily: "'Caveat', cursive",
    }}>
      <span style={{ fontSize: 10, color: '#999', textTransform: 'uppercase', letterSpacing: 1 }}>{label}</span>
      <span style={{ fontSize: 11, color: '#999' }}>{open ? '▲' : '▼'}</span>
    </button>
  )
}
