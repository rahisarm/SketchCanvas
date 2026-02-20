import React, { useRef } from 'react'
import { exportPNG, exportJSON, importJSON } from '../utils/export'
import type { Shape } from '../types'

interface Props {
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  shapes: Shape[]
  sidebarOpen: boolean
  showExport: boolean
  onUndo: () => void
  onRedo: () => void
  onClear: () => void
  onToggleExport: () => void
  onToggleSidebar: () => void
  onImport: (shapes: Shape[]) => void
  onNotify: (msg: string) => void
}

export default function TopBar({
  canvasRef, shapes, sidebarOpen, showExport,
  onUndo, onRedo, onClear, onToggleExport, onToggleSidebar, onImport, onNotify
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null)

  return (
    <>
      {/* Brand */}
      <div style={{
        position: 'absolute', top: 12, left: 12,
        fontFamily: "'Crimson Pro', serif",
        fontSize: 19, fontWeight: 600, color: '#1a1a2e',
        padding: '6px 12px',
        background: '#faf9f6', border: '2px solid #1a1a2e',
        borderRadius: 8, boxShadow: '2px 2px 0 #1a1a2e',
        zIndex: 50, letterSpacing: '-0.4px', userSelect: 'none',
      }}>
        ✏️ SketchCanvas
      </div>

      {/* Actions */}
      <div style={{
        position: 'absolute', top: 12,
        right: sidebarOpen ? 264 : 12,
        display: 'flex', gap: 5, zIndex: 50,
        transition: 'right 0.2s',
        fontFamily: "'Caveat', cursive",
      }}>
        <button onClick={onUndo} className="sketchy-btn" style={{ padding: '5px 11px', fontSize: 13 }} title="Ctrl+Z">↩ Undo</button>
        <button onClick={onRedo} className="sketchy-btn" style={{ padding: '5px 11px', fontSize: 13 }} title="Ctrl+Y">↪ Redo</button>
        <button onClick={() => { if (window.confirm('Clear all shapes?')) { onClear(); onNotify('Canvas cleared') } }}
          className="sketchy-btn" style={{ padding: '5px 11px', fontSize: 13, color: '#e53e3e' }}>
          🗑️ Clear
        </button>
        <button onClick={onToggleExport} className="sketchy-btn" style={{ padding: '5px 11px', fontSize: 13 }}>
          📤 Export
        </button>
        <button onClick={onToggleSidebar} className="sketchy-btn" style={{ padding: '5px 8px', fontSize: 13 }}>
          {sidebarOpen ? '◀' : '▶'}
        </button>
      </div>

      {/* Export dropdown */}
      {showExport && (
        <div className="fade-in" style={{
          position: 'absolute', top: 55,
          right: sidebarOpen ? 264 : 12,
          background: '#faf9f6', border: '2px solid #1a1a2e',
          borderRadius: 8, boxShadow: '3px 3px 0 #1a1a2e',
          zIndex: 200, padding: 12, minWidth: 164,
          transition: 'right 0.2s',
          fontFamily: "'Caveat', cursive",
        }}>
          <button onClick={onToggleExport} style={{
            position: 'absolute', top: 6, right: 9,
            background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#888'
          }}>✕</button>
          <p style={{ fontSize: 11, color: '#aaa', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>Export As</p>
          <button onClick={() => { exportPNG(canvasRef.current!); onToggleExport(); onNotify('Exported PNG!') }}
            className="sketchy-btn" style={{ display: 'block', width: '100%', padding: '6px 10px', marginBottom: 6, textAlign: 'left' }}>
            🖼️ Export PNG
          </button>
          <button onClick={() => { exportJSON(shapes); onToggleExport(); onNotify('Exported JSON!') }}
            className="sketchy-btn" style={{ display: 'block', width: '100%', padding: '6px 10px', marginBottom: 6, textAlign: 'left' }}>
            📄 Export JSON
          </button>
          <label className="sketchy-btn" style={{ display: 'block', padding: '6px 10px', cursor: 'pointer' }}>
            📂 Import JSON
            <input ref={fileRef} type="file" accept=".json" style={{ display: 'none' }}
              onChange={async e => {
                const file = e.target.files?.[0]
                if (!file) return
                try {
                  const shapes = await importJSON(file)
                  onImport(shapes)
                  onToggleExport()
                  onNotify('Imported!')
                } catch { onNotify('Import failed') }
                if (fileRef.current) fileRef.current.value = ''
              }} />
          </label>
        </div>
      )}
    </>
  )
}
