import { useEffect } from 'react'
import type { RefObject } from 'react'
import type { Point } from '../types'

interface Options {
  canvasRef: RefObject<HTMLCanvasElement | null>
  zoom: number
  pan: Point
  setZoom: (fn: (z: number) => number) => void
  setPan: (fn: (p: Point) => Point) => void
}

export function usePanZoom({ canvasRef, zoom, pan, setZoom, setPan }: Options) {
  useEffect(() => {
    const el = canvasRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      if (e.ctrlKey || e.metaKey) {
        const factor = e.deltaY > 0 ? 0.9 : 1.1
        const rect = el.getBoundingClientRect()
        const mx = e.clientX - rect.left
        const my = e.clientY - rect.top
        setZoom(z => {
          const nz = Math.max(0.05, Math.min(30, z * factor))
          setPan(p => ({
            x: mx - (mx - p.x) * (nz / z),
            y: my - (my - p.y) * (nz / z),
          }))
          return nz
        })
      } else {
        setPan(p => ({ x: p.x - e.deltaX, y: p.y - e.deltaY }))
      }
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [canvasRef, setZoom, setPan])
}
