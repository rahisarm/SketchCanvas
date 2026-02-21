import { create } from 'zustand'
import type { Shape, ToolType, Point, BackgroundSettings } from '../types'
import { uid, randomSeed } from '../utils/uid'

const MAX_HISTORY = 60

function loadShapes(): Shape[] {
  try {
    const raw = localStorage.getItem('sketchcanvas-shapes')
    return raw ? (JSON.parse(raw) as Shape[]) : []
  } catch {
    return []
  }
}

function loadBackground(): BackgroundSettings {
  try {
    const raw = localStorage.getItem('sketchcanvas-bg')
    return raw ? (JSON.parse(raw) as BackgroundSettings) : { type: 'solid', color: '#faf9f6', grid: 'line' }
  } catch {
    return { type: 'solid', color: '#faf9f6', grid: 'line' }
  }
}

interface DrawingState {
  shapes: Shape[]
  history: Shape[][]
  historyIdx: number
  tool: ToolType
  strokeColor: string
  strokeWidth: number
  fillColor: string
  fontSize: number
  fontFamily: string
  fontWeight: string
  fontStyle: string
  textAlign: 'left' | 'center' | 'right'
  selectedIds: string[]
  zoom: number
  pan: Point
  backgroundSettings: BackgroundSettings
  snapToGrid: boolean
  clipboard: Shape[]

  setTool: (t: ToolType) => void
  setStrokeColor: (c: string) => void
  setStrokeWidth: (w: number) => void
  setFillColor: (c: string) => void
  setFontSize: (s: number) => void
  setFontFamily: (f: string) => void
  setFontWeight: (w: string) => void
  setFontStyle: (s: string) => void
  setTextAlign: (a: 'left' | 'center' | 'right') => void
  setSelectedIds: (ids: string[]) => void
  setZoom: (z: number | ((prev: number) => number)) => void
  setPan: (p: Point | ((prev: Point) => Point)) => void
  setBackgroundSettings: (s: Partial<BackgroundSettings>) => void
  setSnapToGrid: (v: boolean) => void

  setShapes: (shapes: Shape[]) => void
  pushHistory: (shapes: Shape[]) => void
  undo: () => void
  redo: () => void
  clearAll: () => void
  deleteSelected: () => void
  nudgeSelected: (dx: number, dy: number) => void
  bringToFront: () => void
  sendToBack: () => void
  bringForward: () => void
  sendBackward: () => void
  copySelected: () => void
  paste: () => void
  toggleSelectedBorder: () => void
}

export const useDrawingStore = create<DrawingState>((set, get) => ({
  shapes: loadShapes(),
  history: [loadShapes()],
  historyIdx: 0,
  tool: 'select',
  strokeColor: '#1a1a2e',
  strokeWidth: 2,
  fillColor: 'none',
  fontSize: 20,
  fontFamily: "'Caveat', cursive",
  fontWeight: 'normal',
  fontStyle: 'normal',
  textAlign: 'left',
  selectedIds: [],
  zoom: 1,
  pan: { x: 0, y: 0 },
  backgroundSettings: loadBackground(),
  snapToGrid: typeof window !== 'undefined' ? localStorage.getItem('sketchcanvas-snap') === 'true' : false,
  clipboard: [],

  setTool: t => set({ tool: t }),
  setStrokeColor: c => set({ strokeColor: c }),
  setStrokeWidth: w => set({ strokeWidth: w }),
  setFillColor: c => set({ fillColor: c }),
  setFontSize: s => set({ fontSize: s }),
  setFontFamily: f => set({ fontFamily: f }),
  setFontWeight: w => set({ fontWeight: w }),
  setFontStyle: s => set({ fontStyle: s }),
  setTextAlign: a => set({ textAlign: a }),
  setSelectedIds: ids => set({ selectedIds: ids }),
  setZoom: z => set(s => ({ zoom: typeof z === 'function' ? z(s.zoom) : z })),
  setPan: p => set(s => ({ pan: typeof p === 'function' ? p(s.pan) : p })),
  setBackgroundSettings: settings => set(s => {
    const next = { ...s.backgroundSettings, ...settings }
    try { localStorage.setItem('sketchcanvas-bg', JSON.stringify(next)) } catch { }
    return { backgroundSettings: next }
  }),
  setSnapToGrid: v => {
    try { localStorage.setItem('sketchcanvas-snap', String(v)) } catch { }
    set({ snapToGrid: v })
  },

  setShapes: shapes => {
    try { localStorage.setItem('sketchcanvas-shapes', JSON.stringify(shapes)) } catch { }
    set({ shapes })
  },

  pushHistory: shapes => {
    const { history, historyIdx } = get()
    const newHistory = history.slice(0, historyIdx + 1)
    newHistory.push(JSON.parse(JSON.stringify(shapes)))
    const trimmed = newHistory.slice(-MAX_HISTORY)
    set({ history: trimmed, historyIdx: trimmed.length - 1 })
    try { localStorage.setItem('sketchcanvas-shapes', JSON.stringify(shapes)) } catch { }
    set({ shapes })
  },

  undo: () => {
    const { history, historyIdx } = get()
    if (historyIdx <= 0) return
    const newIdx = historyIdx - 1
    const shapes = JSON.parse(JSON.stringify(history[newIdx])) as Shape[]
    set({ historyIdx: newIdx, shapes, selectedIds: [] })
    try { localStorage.setItem('sketchcanvas-shapes', JSON.stringify(shapes)) } catch { }
  },

  redo: () => {
    const { history, historyIdx } = get()
    if (historyIdx >= history.length - 1) return
    const newIdx = historyIdx + 1
    const shapes = JSON.parse(JSON.stringify(history[newIdx])) as Shape[]
    set({ historyIdx: newIdx, shapes, selectedIds: [] })
    try { localStorage.setItem('sketchcanvas-shapes', JSON.stringify(shapes)) } catch { }
  },

  clearAll: () => {
    get().pushHistory([])
    set({ selectedIds: [] })
  },

  deleteSelected: () => {
    const { shapes, selectedIds } = get()
    if (selectedIds.length === 0) return
    const next = shapes.filter(s => !selectedIds.includes(s.id))
    get().pushHistory(next)
    set({ selectedIds: [] })
  },

  nudgeSelected: (dx, dy) => {
    const { shapes, selectedIds } = get()
    if (selectedIds.length === 0) return
    const next = shapes.map(s => {
      if (!selectedIds.includes(s.id)) return s
      if (s.type === 'freehand' && s.points) {
        return { ...s, points: s.points.map(([px, py]) => [px + dx, py + dy] as [number, number]) }
      }
      return { ...s, x: s.x + dx, y: s.y + dy }
    })
    set({ shapes: next })
    try { localStorage.setItem('sketchcanvas-shapes', JSON.stringify(next)) } catch { }
  },

  bringToFront: () => {
    const { shapes, selectedIds } = get()
    if (selectedIds.length === 0) return
    const selected = shapes.filter(s => selectedIds.includes(s.id))
    const remaining = shapes.filter(s => !selectedIds.includes(s.id))
    const next = [...remaining, ...selected]
    get().pushHistory(next)
  },

  sendToBack: () => {
    const { shapes, selectedIds } = get()
    if (selectedIds.length === 0) return
    const selected = shapes.filter(s => selectedIds.includes(s.id))
    const remaining = shapes.filter(s => !selectedIds.includes(s.id))
    const next = [...selected, ...remaining]
    get().pushHistory(next)
  },

  bringForward: () => {
    const { shapes, selectedIds } = get()
    if (selectedIds.length === 0) return
    const next = [...shapes]
    // Move from front to back to avoid double-moving
    for (let i = next.length - 2; i >= 0; i--) {
      if (selectedIds.includes(next[i].id) && !selectedIds.includes(next[i + 1].id)) {
        [next[i], next[i + 1]] = [next[i + 1], next[i]]
      }
    }
    get().pushHistory(next)
  },

  sendBackward: () => {
    const { shapes, selectedIds } = get()
    if (selectedIds.length === 0) return
    const next = [...shapes]
    // Move from back to front to avoid double-moving
    for (let i = 1; i < next.length; i++) {
      if (selectedIds.includes(next[i].id) && !selectedIds.includes(next[i - 1].id)) {
        [next[i], next[i - 1]] = [next[i - 1], next[i]]
      }
    }
    get().pushHistory(next)
  },

  copySelected: () => {
    const { shapes, selectedIds } = get()
    if (selectedIds.length === 0) return
    const selected = shapes.filter(s => selectedIds.includes(s.id))
    set({ clipboard: JSON.parse(JSON.stringify(selected)) })
  },

  paste: () => {
    const { shapes, clipboard } = get()
    if (clipboard.length === 0) return

    const newShapes: Shape[] = clipboard.map(s => {
      const copy = JSON.parse(JSON.stringify(s)) as Shape
      copy.id = uid()
      copy.seed = randomSeed()
      copy.x += 20
      copy.y += 20
      if (copy.type === 'freehand' && copy.points) {
        copy.points = copy.points.map(([px, py]) => [px + 20, py + 20])
      }
      return copy
    })

    const next = [...shapes, ...newShapes]
    get().pushHistory(next)
    set({ selectedIds: newShapes.map(s => s.id) })
  },

  toggleSelectedBorder: () => {
    const { shapes, selectedIds } = get()
    if (selectedIds.length === 0) return
    const next = shapes.map(s => {
      if (!selectedIds.includes(s.id) || s.type !== 'image') return s
      return { ...s, noBorder: !s.noBorder }
    })
    get().pushHistory(next)
  },
}))
