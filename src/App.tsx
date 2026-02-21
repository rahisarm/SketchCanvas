import { useRef, useState, useEffect, useCallback } from 'react'
import { useDrawingStore } from './store/useDrawingStore'
import { renderAll } from './shapes/render'
import { getCombinedBB } from './shapes/geometry'
import { uid, randomSeed } from './utils/uid'
import { usePanZoom } from './hooks/usePanZoom'
import { useCanvasResize } from './hooks/useCanvasResize'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { useDragAndDrop } from './hooks/useDragAndDrop'
import { useTextTool } from './hooks/useTextTool'
import { useCanvasEvents } from './hooks/useCanvasEvents'
import Toolbar from './components/Toolbar'
import Sidebar from './components/Sidebar'
import ZoomControls from './components/ZoomControls'
import TopBar from './components/TopBar'
import type { Shape, LibraryItem } from './types'

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const {
    shapes, tool, zoom, pan, selectedIds,
    strokeColor, strokeWidth, fillColor, fontSize,
    fontFamily, fontWeight, fontStyle, textAlign,
    backgroundSettings,
    setTool, setStrokeColor, setStrokeWidth, setFillColor, setFontSize,
    setFontFamily, setFontWeight, setFontStyle, setTextAlign,
    setSelectedIds, setZoom, setPan, setBackgroundSettings, setSnapToGrid,
    clearAll, toggleSelectedBorder,
    undo, redo, deleteSelected, sendToBack, sendBackward, bringForward, bringToFront, copySelected, paste,
    pushHistory, snapToGrid
  } = useDrawingStore()

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 768)
  const [showExport, setShowExport] = useState(false)
  const [notification, setNotification] = useState('')

  // ── Notify helper ────────────────────────────────────────────────────────────
  const notify = useCallback((msg: string) => {
    setNotification(msg)
    setTimeout(() => setNotification(''), 1600)
  }, [])

  // ── Custom Hooks ─────────────────────────────────────────────────────────────
  const { textInput, setTextInput, textValue, setTextValue, textInputRef, commitText, onDoubleClick } = useTextTool(canvasRef)
  const { isDrawing, currentShape, lasso, getCursor, onMouseDown, onMouseMove, onMouseUp } = useCanvasEvents({ canvasRef, textInput, setTextInput, setTextValue, textInputRef })

  useKeyboardShortcuts({ isTextInputActive: !!textInput, notify })
  useDragAndDrop({ pan, zoom, notify })

  // ── Responsiveness ───────────────────────────────────────────────────────────
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // ── Render ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    renderAll(canvas, shapes, currentShape, selectedIds, pan, zoom, lasso, isDrawing, backgroundSettings)
  }, [shapes, currentShape, selectedIds, pan, zoom, lasso, isDrawing, backgroundSettings])

  // ── Canvas resize ────────────────────────────────────────────────────────────
  useCanvasResize(canvasRef)

  // ── Pan/Zoom wheel ───────────────────────────────────────────────────────────
  usePanZoom({ canvasRef, zoom, pan, setZoom, setPan })

  // ── Add library shape ─────────────────────────────────────────────────────────
  const addLibraryShape = useCallback((item: LibraryItem) => {
    const cx = (window.innerWidth / 2 - pan.x) / zoom
    const cy = (window.innerHeight / 2 - pan.y) / zoom
    let w = 140, h = 100
    if (item.shapeType === 'image') { w = 80; h = 80 }
    const shape: Shape = {
      id: uid(), type: item.shapeType,
      x: cx - w / 2, y: cy - h / 2, w, h,
      strokeColor, strokeWidth, fillColor, seed: randomSeed(), fontSize,
      imageUrl: item.imageUrl,
    }
    if (item.shapeType === 'freehand' && item.points) {
      shape.points = item.points.map(([px, py]) => [cx - 45 + px, cy - 20 + py])
      shape.w = 90; shape.h = 40
    }
    const next = [...shapes, shape]
    useDrawingStore.getState().pushHistory(next)
    setSelectedIds([shape.id])
    notify(`Added ${item.name}`)
  }, [shapes, pan, zoom, strokeColor, strokeWidth, fillColor, fontSize, setSelectedIds, notify])

  // ── Fit content ───────────────────────────────────────────────────────────────
  const fitContent = useCallback(() => {
    if (shapes.length === 0) return
    const bb = getCombinedBB(shapes)
    const W = window.innerWidth - (sidebarOpen ? 252 : 0) - 40
    const H = window.innerHeight - 80
    const nz = Math.min(W / (bb.w + 80), H / (bb.h + 80), 5)
    setZoom(() => nz)
    setPan(() => ({
      x: (W + 40) / 2 - (bb.x + bb.w / 2) * nz,
      y: H / 2 + 40 - (bb.y + bb.h / 2) * nz,
    }))
  }, [shapes, sidebarOpen, setZoom, setPan])



  // ─────────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      <canvas
        ref={canvasRef}
        style={{ position: 'absolute', top: 0, left: 0, cursor: getCursor() }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onDoubleClick={onDoubleClick}
      />

      {/* Inline text editor */}
      {textInput && (
        <textarea
          ref={textInputRef}
          value={textValue}
          onChange={e => setTextValue(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Escape') setTextInput(null)
            else if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commitText() }
          }}
          onBlur={() => commitText()}
          style={{
            position: 'absolute',
            left: `${textInput.sx}px`,
            top: `${textInput.sy}px`,
            background: 'white',
            border: '2px solid #3b82f6',
            borderRadius: 4,
            outline: 'none',
            resize: 'both',
            minWidth: 120,
            minHeight: 38,
            fontFamily,
            fontSize: `${fontSize}px`,
            color: strokeColor,
            fontWeight,
            fontStyle,
            textAlign,
            padding: '3px 6px',
            zIndex: 2000,
            lineHeight: 1.2,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          }}
          placeholder="Type here..."
          autoFocus
        />
      )}

      {/* Toolbar */}
      <Toolbar
        tool={tool} strokeColor={strokeColor} strokeWidth={strokeWidth}
        onTool={setTool} onColor={setStrokeColor} onWidth={setStrokeWidth}
      />

      {/* Top bar */}
      <TopBar
        canvasRef={canvasRef} shapes={shapes}
        sidebarOpen={sidebarOpen} showExport={showExport}
        onUndo={() => { undo(); notify('Undo') }}
        onRedo={() => { redo(); notify('Redo') }}
        onClear={clearAll}
        onToggleExport={() => setShowExport(v => !v)}
        onToggleSidebar={() => setSidebarOpen(v => !v)}
        onImport={s => { pushHistory(s); notify('Imported!') }}
        onNotify={notify}
      />

      {/* Sidebar */}
      <Sidebar
        visible={sidebarOpen}
        shapes={shapes} selectedIds={selectedIds}
        fillColor={fillColor} fontSize={fontSize}
        fontFamily={fontFamily} fontWeight={fontWeight} fontStyle={fontStyle} textAlign={textAlign}
        backgroundSettings={backgroundSettings}
        snapToGrid={snapToGrid}
        onSelectShape={id => {
          if (id === 'CLOSE_SIDEBAR') setSidebarOpen(false)
          else setSelectedIds([id])
        }}
        onDeleteShape={id => {
          const next = shapes.filter(s => s.id !== id)
          pushHistory(next)
          setSelectedIds(selectedIds.filter(i => i !== id))
        }}
        onDeleteSelected={deleteSelected}
        onFillColor={setFillColor}
        onFontSize={setFontSize}
        onFontFamily={setFontFamily}
        onFontWeight={setFontWeight}
        onFontStyle={setFontStyle}
        onTextAlign={setTextAlign}
        onAddLibrary={addLibraryShape}
        onBackgroundSettings={setBackgroundSettings}
        onSnapToGrid={setSnapToGrid}
      />

      {/* Zoom controls */}
      <ZoomControls
        zoom={zoom} sidebarOpen={sidebarOpen} isMobile={isMobile}
        onZoomIn={() => setZoom(z => Math.min(30, z * 1.25))}
        onZoomOut={() => setZoom(z => Math.max(0.05, z * 0.8))}
        onReset={() => { setZoom(() => 1); setPan(() => ({ x: 0, y: 0 })) }}
        onFitContent={fitContent}
      />

      {/* Selection info bar */}
      {selectedIds.length > 0 && (
        <div style={{
          position: 'absolute', bottom: 20, left: 12,
          background: '#faf9f6', border: '2px solid #1a1a2e',
          borderRadius: 8, boxShadow: '2px 2px 0 #1a1a2e',
          padding: '5px 12px', fontSize: 13, color: '#555', zIndex: 50,
          fontFamily: "'Caveat', cursive",
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div>{selectedIds.length} selected</div>

          <div style={{ display: 'flex', gap: 4, borderLeft: '1px solid #ddd', paddingLeft: 12 }}>
            <button
              onClick={() => { sendToBack(); notify('Sent to Back') }}
              title="Send to Back (Shift + [)"
              className="layer-btn"
            >⤓</button>
            <button
              onClick={() => { sendBackward(); notify('Sent Backward') }}
              title="Send Backward ([)"
              className="layer-btn"
            >↓</button>
            <button
              onClick={() => { bringForward(); notify('Brought Forward') }}
              title="Bring Forward (])"
              className="layer-btn"
            >↑</button>
            <button
              onClick={() => { bringToFront(); notify('Brought to Front') }}
              title="Bring to Front (Shift + ])"
              className="layer-btn"
            >⤒</button>
          </div>

          {shapes.filter(s => selectedIds.includes(s.id) && s.type === 'image').length > 0 && (
            <div style={{ display: 'flex', gap: 4, borderLeft: '1px solid #ddd', paddingLeft: 12 }}>
              <button
                onClick={() => { toggleSelectedBorder(); notify('Border Toggled') }}
                title="Toggle Border"
                className="layer-btn"
                style={{ fontSize: 12, padding: '2px 6px' }}
              >Border</button>
            </div>
          )}

          <div style={{ display: 'flex', gap: 4, borderLeft: '1px solid #ddd', paddingLeft: 12 }}>
            <button
              onClick={() => { copySelected(); notify('Copied') }}
              title="Copy (Ctrl+C)"
              className="layer-btn"
            >📋</button>
            <button
              onClick={() => { paste(); notify('Pasted') }}
              title="Paste (Ctrl+V)"
              className="layer-btn"
            >📥</button>
          </div>

          <span style={{ marginLeft: 8, color: '#bbb', fontSize: 11 }}>
            Del · [ ] to layer · Ctrl+C/V · Arrows
          </span>
        </div>
      )}

      {/* Toast */}
      {notification && (
        <div className="slide-up" style={{
          position: 'absolute', bottom: 68, left: '50%', transform: 'translateX(-50%)',
          background: '#1a1a2e', color: '#faf9f6',
          padding: '7px 18px', borderRadius: 20, fontSize: 14,
          zIndex: 300, whiteSpace: 'nowrap',
          boxShadow: '2px 2px 8px rgba(0,0,0,0.18)',
          fontFamily: "'Caveat', cursive",
        }}>
          {notification}
        </div>
      )}
    </div>
  )
}
