import { useState, useCallback, type RefObject } from 'react'
import { useDrawingStore } from '../store/useDrawingStore'
import { getPos, pointInShape, getHandleAt, getBoundingBox, screenToCanvas } from '../shapes/geometry'
import { uid, randomSeed } from '../utils/uid'
import { snap } from '../utils/snap'
import type { Shape, Point, DragOrigin } from '../types'

interface UseCanvasEventsProps {
    canvasRef: RefObject<HTMLCanvasElement | null>
    textInput: any
    setTextInput: (v: any) => void
    setTextValue: (v: string) => void
    textInputRef: RefObject<HTMLTextAreaElement | null>
}

export function useCanvasEvents({ canvasRef, textInput, setTextInput, setTextValue, textInputRef }: UseCanvasEventsProps) {
    const pan = useDrawingStore(s => s.pan)
    const zoom = useDrawingStore(s => s.zoom)
    const setPan = useDrawingStore(s => s.setPan)

    const [isDrawing, setIsDrawing] = useState(false)
    const [currentShape, setCurrentShape] = useState<Shape | null>(null)
    const [resizing, setResizing] = useState<{ handle: string, startX: number, startY: number, origShapes: DragOrigin[] } | null>(null)

    const [isPanning, setIsPanning] = useState(false)
    const [panStart, setPanStart] = useState<Point | null>(null)
    const [panOrigin, setPanOrigin] = useState<Point | null>(null)

    const [lasso, setLasso] = useState<Point[] | null>(null)

    const [dragStart, setDragStart] = useState<Point | null>(null)
    const [dragOrigin, setDragOrigin] = useState<DragOrigin[] | null>(null)

    const getCursor = useCallback(() => {
        const tool = useDrawingStore.getState().tool
        if (isPanning) return 'grabbing'
        if (tool === 'eraser') return 'cell'
        if (tool === 'select') return 'default'
        return 'crosshair'
    }, [isPanning])

    const onMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        const state = useDrawingStore.getState()
        const { tool, shapes, selectedIds, strokeColor, strokeWidth, fillColor, fontSize, snapToGrid, pushHistory, setSelectedIds } = state

        // Middle click or alt+drag → pan
        if (e.button === 1 || (e.button === 0 && e.altKey)) {
            setIsPanning(true)
            setPanStart({ x: e.clientX, y: e.clientY })
            setPanOrigin({ ...pan })
            e.preventDefault()
            return
        }
        if (e.button !== 0) return

        if (!canvasRef.current) return
        const { sx, sy, x, y } = getPos(e, canvasRef.current, pan, zoom)

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
            e.preventDefault() // Prevent canvas from stealing focus immediately
            if (textInput) {
                textInputRef.current?.blur()
                return
            }
            setTextInput({ x, y, sx, sy })
            setTextValue('')
            setTimeout(() => {
                textInputRef.current?.focus()
            }, 40)
            return
        }

        // ── DRAW ────────────────────────────────────────────────────────────────────
        setIsDrawing(true)
        const startX = snapToGrid ? snap(x) : x
        const startY = snapToGrid ? snap(y) : y
        setCurrentShape({
            id: uid(), type: tool,
            x: startX, y: startY, w: 0, h: 0, seed: randomSeed(),
            strokeColor, strokeWidth, fillColor, fontSize,
            points: tool === 'freehand' ? [[startX, startY]] : undefined,
        })
    }, [pan, zoom, textInput, setTextInput, setTextValue, textInputRef, canvasRef])

    const onMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        if (isPanning && panStart && panOrigin) {
            setPan(() => ({ x: panOrigin.x + e.clientX - panStart.x, y: panOrigin.y + e.clientY - panStart.y }))
            return
        }

        if (!canvasRef.current) return
        const { sx, sy, x, y } = getPos(e, canvasRef.current, pan, zoom)
        const state = useDrawingStore.getState()
        const { shapes, selectedIds, tool, snapToGrid, setShapes } = state

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
                    const snappedX = snap(nx), snappedY = snap(ny)
                    nw = snap(nx + nw) - snappedX
                    nh = snap(ny + nh) - snappedY
                    nx = snappedX; ny = snappedY
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
    }, [isPanning, panStart, panOrigin, resizing, lasso, dragStart, dragOrigin, isDrawing, currentShape, zoom, pan, setPan, canvasRef])

    const onMouseUp = useCallback(() => {
        const state = useDrawingStore.getState()
        const { shapes, tool, setSelectedIds, pushHistory } = state

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

        const finalShape = { ...currentShape }

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
    }, [isPanning, resizing, lasso, dragStart, isDrawing, currentShape, pan, zoom])

    return {
        isDrawing,
        currentShape,
        lasso,
        getCursor,
        onMouseDown,
        onMouseMove,
        onMouseUp
    }
}
