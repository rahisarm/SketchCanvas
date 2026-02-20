import React, { useRef, useState, useEffect, useCallback } from 'react'
import { useDrawingStore } from './store/useDrawingStore'
import { renderAll } from './shapes/render'
import { getBoundingBox, pointInShape, getResizeHandles, screenToCanvas, getCombinedBB } from './shapes/geometry'
import { uid, randomSeed } from './utils/uid'
import { usePanZoom } from './hooks/usePanZoom'
import { useCanvasResize } from './hooks/useCanvasResize'
import Toolbar from './components/Toolbar'
import Sidebar from './components/Sidebar'
import ZoomControls from './components/ZoomControls'
import TopBar from './components/TopBar'
import type { Shape, Point, DragOrigin } from './types'
import type { LibraryItem } from './types'
import { snap } from './utils/snap'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getPos(e: React.MouseEvent, canvas: HTMLCanvasElement, pan: Point, zoom: number) {
  const rect = canvas.getBoundingClientRect()
  const sx = e.clientX - rect.left
  const sy = e.clientY - rect.top
  const { x, y } = screenToCanvas(sx, sy, pan, zoom)
  return { sx, sy, x, y }
}

function getHandleAt(
  sx: number, sy: number,
  selectedIds: string[],
  shapes: Shape[],
  pan: Point, zoom: number
) {
  if (selectedIds.length === 0) return null
  const sel = shapes.filter(s => selectedIds.includes(s.id))
  const bb = sel.length === 1 ? getBoundingBox(sel[0]) : getCombinedBB(sel)
  const pad = 9
  const screenBB = {
    x: bb.x * zoom + pan.x - pad, y: bb.y * zoom + pan.y - pad,
    w: bb.w * zoom + pad * 2, h: bb.h * zoom + pad * 2,
  }
  const handles = getResizeHandles(screenBB)
  return handles.find(h => Math.hypot(sx - h.x, sy - h.y) < 9) ?? null
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const textInputRef = useRef<HTMLTextAreaElement>(null)

  const {
    shapes, tool, zoom, pan, selectedIds,
    strokeColor, strokeWidth, fillColor, fontSize, backgroundSettings, snapToGrid,
    setTool, setStrokeColor, setStrokeWidth, setFillColor, setFontSize,
    setSelectedIds, setZoom, setPan, setBackgroundSettings, setSnapToGrid,
    setShapes, pushHistory, undo, redo, clearAll, deleteSelected, nudgeSelected,
    bringToFront, sendToBack, bringForward, sendBackward,
    copySelected, paste, toggleSelectedBorder,
  } = useDrawingStore()

  // Local transient state
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentShape, setCurrentShape] = useState<Shape | null>(null)
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState<Point | null>(null)
  const [panOrigin, setPanOrigin] = useState<Point | null>(null)
  const [lasso, setLasso] = useState<Point[] | null>(null)
  const [dragStart, setDragStart] = useState<Point | null>(null)
  const [dragOrigin, setDragOrigin] = useState<DragOrigin[] | null>(null)
  const [resizing, setResizing] = useState<{ handle: string; startX: number; startY: number; origShapes: DragOrigin[] } | null>(null)
  const [textInput, setTextInput] = useState<{ x: number; y: number; sx: number; sy: number } | null>(null)
  const [textValue, setTextValue] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [showExport, setShowExport] = useState(false)
  const [notification, setNotification] = useState('')

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

  // ── Notify helper ────────────────────────────────────────────────────────────
  const notify = useCallback((msg: string) => {
    setNotification(msg)
    setTimeout(() => setNotification(''), 1600)
  }, [])

  // ── Keyboard shortcuts ───────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (textInput) return
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return

      // Ctrl shortcuts
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); notify('Undo'); return }
        if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) { e.preventDefault(); redo(); notify('Redo'); return }
        if (e.key === 'a') { e.preventDefault(); setSelectedIds(shapes.map(s => s.id)); return }
        if (e.key === 'c') { e.preventDefault(); copySelected(); notify('Copied'); return }
        if (e.key === 'v') { e.preventDefault(); paste(); notify('Pasted'); return }
        return
      }

      const toolMap: Record<string, typeof tool> = {
        v: 'select', f: 'freehand', r: 'rect', e: 'ellipse',
        a: 'arrow', l: 'line', t: 'text', x: 'eraser',
      }
      if (toolMap[e.key]) { setTool(toolMap[e.key]); return }
      if (e.key === 'Delete' || e.key === 'Backspace') { deleteSelected(); return }
      if (e.key === 'Escape') { setSelectedIds([]); setTool('select'); return }

      // Nudge
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key) && selectedIds.length > 0) {
        e.preventDefault()
        const d = e.shiftKey ? 10 : 1
        const dx = e.key === 'ArrowLeft' ? -d : e.key === 'ArrowRight' ? d : 0
        const dy = e.key === 'ArrowUp' ? -d : e.key === 'ArrowDown' ? d : 0
        nudgeSelected(dx, dy)
        return
      }

      if (selectedIds.length > 0) {
        if (e.key === ']') {
          e.preventDefault()
          if (e.shiftKey) { bringToFront(); notify('Bring to Front') }
          else { bringForward(); notify('Bring Forward') }
        }
        if (e.key === '[') {
          e.preventDefault()
          if (e.shiftKey) { sendToBack(); notify('Send to Back') }
          else { sendBackward(); notify('Send Backward') }
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [shapes, selectedIds, tool, textInput, undo, redo, notify, setTool, setSelectedIds, deleteSelected, nudgeSelected])

  // ── Drag & Drop ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'
    }

    const handleDrop = async (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()

      const files = e.dataTransfer?.files
      if (!files || files.length === 0) return

      const { x: dropX, y: dropY } = screenToCanvas(e.clientX, e.clientY, pan, zoom)
      const newItems: Shape[] = []

      const filePromises = Array.from(files).map((file, i) => {
        if (!file.type.startsWith('image/')) return Promise.resolve()

        return new Promise<void>((resolve) => {
          const reader = new FileReader()
          reader.onload = (event) => {
            const url = event.target?.result as string
            if (url) {
              newItems.push({
                id: uid(), type: 'image',
                x: dropX + i * 20, y: dropY + i * 20,
                w: 250, h: 250,
                imageUrl: url,
                seed: randomSeed(),
                strokeColor, strokeWidth, fillColor, fontSize,
              })
            }
            resolve()
          }
          reader.readAsDataURL(file)
        })
      })

      await Promise.all(filePromises)

      if (newItems.length > 0) {
        const store = useDrawingStore.getState()
        store.pushHistory([...store.shapes, ...newItems])
        setSelectedIds(newItems.map(s => s.id))
        notify(`Added ${newItems.length} image${newItems.length > 1 ? 's' : ''}`)
      }
    }

    window.addEventListener('dragover', handleDragOver)
    window.addEventListener('drop', handleDrop)
    return () => {
      window.removeEventListener('dragover', handleDragOver)
      window.removeEventListener('drop', handleDrop)
    }
  }, [pan, zoom, strokeColor, strokeWidth, fillColor, fontSize, notify, setSelectedIds])

  // ── Commit text ───────────────────────────────────────────────────────────────
  const commitText = useCallback(() => {
    if (!textInput || !textValue.trim()) { setTextInput(null); return }
    const newShape: Shape = {
      id: uid(), type: 'text',
      x: textInput.x, y: textInput.y,
      text: textValue, strokeColor, fontSize,
      seed: randomSeed(), strokeWidth, fillColor,
      w: textValue.length * fontSize * 0.6, h: fontSize,
    }
    const next = [...shapes, newShape]
    pushHistory(next)
    setSelectedIds([newShape.id])
    setTextInput(null)
    setTextValue('')
  }, [textInput, textValue, shapes, strokeColor, fontSize, strokeWidth, fillColor, pushHistory, setSelectedIds])

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
    pushHistory(next)
    setSelectedIds([shape.id])
    notify(`Added ${item.name}`)
  }, [shapes, pan, zoom, strokeColor, strokeWidth, fillColor, fontSize, pushHistory, setSelectedIds, notify])

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

  // ── Mouse cursor ───────────────────────────────────────────────────────────────
  const getCursor = () => {
    if (isPanning) return 'grabbing'
    if (tool === 'eraser') return 'cell'
    if (tool === 'select') return 'default'
    return 'crosshair'
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Mouse handlers
  // ─────────────────────────────────────────────────────────────────────────────

  const onMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    // Middle click or alt+drag → pan
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      setIsPanning(true)
      setPanStart({ x: e.clientX, y: e.clientY })
      setPanOrigin({ ...pan })
      e.preventDefault()
      return
    }
    if (e.button !== 0) return

    const { sx, sy, x, y } = getPos(e, canvasRef.current!, pan, zoom)

    // ── SELECT ──────────────────────────────────────────────────────────────────
    if (tool === 'select') {
      const handle = getHandleAt(sx, sy, selectedIds, shapes, pan, zoom)
      if (handle) {
        setResizing({
          handle: handle.id, startX: sx, startY: sy,
          origShapes: shapes
            .filter(s => selectedIds.includes(s.id))
            .map(s => ({ id: s.id, x: s.x, y: s.y, w: s.w, h: s.h, points: s.points ? JSON.parse(JSON.stringify(s.points)) : undefined })),
        })
        return
      }
      // Hit test
      let clicked: Shape | null = null
      for (let i = shapes.length - 1; i >= 0; i--) {
        if (pointInShape(x, y, shapes[i])) { clicked = shapes[i]; break }
      }
      if (clicked) {
        if (e.shiftKey) {
          setSelectedIds(selectedIds.includes(clicked.id)
            ? selectedIds.filter(id => id !== clicked!.id)
            : [...selectedIds, clicked.id])
        } else {
          if (!selectedIds.includes(clicked.id)) setSelectedIds([clicked.id])
          setDragStart({ x: sx, y: sy })
          setDragOrigin(shapes.map(s => ({ id: s.id, x: s.x, y: s.y, w: s.w, h: s.h, points: s.points ? JSON.parse(JSON.stringify(s.points)) : undefined })))
        }
      } else {
        setSelectedIds([])
        setLasso([{ x: sx, y: sy }])
      }
      return
    }

    // ── ERASER ──────────────────────────────────────────────────────────────────
    if (tool === 'eraser') {
      const hit = shapes.filter(s => pointInShape(x, y, s))
      if (hit.length > 0) {
        const ids = hit.map(s => s.id)
        const next = shapes.filter(s => !ids.includes(s.id))
        pushHistory(next)
      }
      setIsDrawing(true)
      return
    }

    // ── TEXT ────────────────────────────────────────────────────────────────────
    if (tool === 'text') {
      const rect = canvasRef.current!.getBoundingClientRect()
      setTextInput({ x, y, sx: e.clientX - rect.left, sy: e.clientY - rect.top })
      setTextValue('')
      setTimeout(() => textInputRef.current?.focus(), 40)
      return
    }

    // ── DRAW ────────────────────────────────────────────────────────────────────
    setIsDrawing(true)
    const startX = snapToGrid ? snap(x) : x
    const startY = snapToGrid ? snap(y) : y
    setCurrentShape({
      id: uid(), type: tool as Shape['type'],
      x: startX, y: startY, w: 0, h: 0, seed: randomSeed(),
      strokeColor, strokeWidth, fillColor, fontSize,
      points: tool === 'freehand' ? [[startX, startY]] : undefined,
    })
  }, [tool, shapes, selectedIds, pan, zoom, strokeColor, strokeWidth, fillColor, fontSize, snapToGrid, pushHistory, setSelectedIds])

  const onMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPanning && panStart && panOrigin) {
      setPan(() => ({ x: panOrigin.x + e.clientX - panStart.x, y: panOrigin.y + e.clientY - panStart.y }))
      return
    }

    const { sx, sy, x, y } = getPos(e, canvasRef.current!, pan, zoom)

    // Resize
    if (resizing && e.buttons === 1) {
      const dx = (sx - resizing.startX) / zoom
      const dy = (sy - resizing.startY) / zoom
      const h = resizing.handle
      setShapes(shapes.map(s => {
        if (!selectedIds.includes(s.id)) return s
        const orig = resizing.origShapes.find(o => o.id === s.id)
        if (!orig) return s
        let nx = orig.x, ny = orig.y, nw = orig.w, nh = orig.h
        if (h.includes('e')) nw = orig.w + dx
        if (h.includes('s')) nh = orig.h + dy
        if (h.includes('w')) { nx = orig.x + dx; nw = orig.w - dx }
        if (h.includes('n')) { ny = orig.y + dy; nh = orig.h - dy }

        if (snapToGrid) {
          const sx = snap(nx), sy = snap(ny)
          nw = snap(nx + nw) - sx
          nh = snap(ny + nh) - sy
          nx = sx; ny = sy
        }
        return { ...s, x: nx, y: ny, w: nw, h: nh }
      }))
      return
    }

    // Lasso
    if (lasso && e.buttons === 1) {
      setLasso(prev => [...(prev ?? []), { x: sx, y: sy }])
      return
    }

    // Drag selected
    if (dragStart && dragOrigin && e.buttons === 1) {
      const dx = (sx - dragStart.x) / zoom
      const dy = (sy - dragStart.y) / zoom
      setShapes(shapes.map(s => {
        if (!selectedIds.includes(s.id)) return s
        const orig = dragOrigin.find(o => o.id === s.id)
        if (!orig) return s
        if (s.type === 'freehand' && orig.points) {
          const finalDx = snapToGrid ? snap(dx) : dx
          const finalDy = snapToGrid ? snap(dy) : dy
          return { ...s, points: orig.points.map(([px, py]) => [px + finalDx, py + finalDy] as [number, number]) }
        }
        const nx = snapToGrid ? snap(orig.x + dx) : orig.x + dx
        const ny = snapToGrid ? snap(orig.y + dy) : orig.y + dy
        return { ...s, x: nx, y: ny }
      }))
      return
    }

    if (!isDrawing || !currentShape) return

    if (tool === 'freehand') {
      setCurrentShape(prev => prev ? { ...prev, points: [...(prev.points ?? []), [x, y]] } : null)
    } else {
      const nw = snapToGrid ? snap(x) - currentShape.x : x - currentShape.x
      const nh = snapToGrid ? snap(y) - currentShape.y : y - currentShape.y
      setCurrentShape(prev => prev ? { ...prev, w: nw, h: nh } : null)
    }

    // Live eraser
    if (tool === 'eraser') {
      const hit = shapes.filter(s => pointInShape(x, y, s))
      if (hit.length > 0) {
        const ids = new Set(hit.map(s => s.id))
        setShapes(shapes.filter(s => !ids.has(s.id)))
      }
    }
  }, [isPanning, panStart, panOrigin, resizing, lasso, dragStart, dragOrigin, isDrawing, currentShape, tool, shapes, selectedIds, zoom, pan, setShapes, setPan])

  const onMouseUp = useCallback(() => {
    if (isPanning) { setIsPanning(false); return }

    if (resizing) {
      setResizing(null)
      pushHistory(shapes)
      return
    }

    // Lasso select
    if (lasso) {
      if (lasso.length > 2) {
        const xs = lasso.map(p => p.x), ys = lasso.map(p => p.y)
        const c1 = screenToCanvas(Math.min(...xs), Math.min(...ys), pan, zoom)
        const c2 = screenToCanvas(Math.max(...xs), Math.max(...ys), pan, zoom)
        const sel = shapes.filter(s => {
          const bb = getBoundingBox(s)
          return bb.x >= c1.x && bb.y >= c1.y && bb.x + bb.w <= c2.x && bb.y + bb.h <= c2.y
        })
        if (sel.length > 0) setSelectedIds(sel.map(s => s.id))
      }
      setLasso(null)
      return
    }

    if (dragStart) {
      setDragStart(null)
      setDragOrigin(null)
      pushHistory(shapes)
      return
    }

    if (!isDrawing || !currentShape) return
    setIsDrawing(false)

    let finalShape = { ...currentShape }

    // Discard tiny shapes
    if (tool === 'freehand') {
      if (!finalShape.points || finalShape.points.length < 2) { setCurrentShape(null); return }
    } else {
      if (Math.abs(finalShape.w) < 3 && Math.abs(finalShape.h) < 3) { setCurrentShape(null); return }
      // Normalize negative dimensions for most shape types
      const normTypes = ['rect', 'ellipse', 'diamond', 'triangle', 'hexagon', 'star', 'database', 'bubble', 'cylinder', 'browser', 'arrowRight']
      if (normTypes.includes(finalShape.type)) {
        if (finalShape.w < 0) { finalShape.x += finalShape.w; finalShape.w = -finalShape.w }
        if (finalShape.h < 0) { finalShape.y += finalShape.h; finalShape.h = -finalShape.h }
      }
    }

    const next = [...shapes, finalShape]
    pushHistory(next)
    setCurrentShape(null)
    if (tool !== 'freehand' && tool !== 'eraser') setSelectedIds([finalShape.id])
  }, [isPanning, resizing, lasso, dragStart, isDrawing, currentShape, tool, shapes, pan, zoom, pushHistory, setSelectedIds])

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
          onBlur={commitText}
          style={{
            position: 'absolute', left: textInput.sx, top: textInput.sy,
            background: 'transparent', border: '2px dashed #3b82f6',
            borderRadius: 4, outline: 'none', resize: 'both',
            minWidth: 120, minHeight: 38,
            fontFamily: "'Caveat', cursive", fontSize, color: strokeColor,
            padding: '3px 6px', zIndex: 100, lineHeight: 1.3,
          }}
          placeholder="Type here…"
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
        backgroundSettings={backgroundSettings}
        snapToGrid={snapToGrid}
        onSelectShape={id => setSelectedIds([id])}
        onDeleteShape={id => {
          const next = shapes.filter(s => s.id !== id)
          pushHistory(next)
          setSelectedIds(selectedIds.filter(i => i !== id))
        }}
        onDeleteSelected={deleteSelected}
        onFillColor={setFillColor}
        onFontSize={setFontSize}
        onAddLibrary={addLibraryShape}
        onBackgroundSettings={setBackgroundSettings}
        onSnapToGrid={setSnapToGrid}
      />

      {/* Zoom controls */}
      <ZoomControls
        zoom={zoom} sidebarOpen={sidebarOpen} shapes={shapes}
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
