import { useEffect } from 'react'
import type { RefObject } from 'react'

export function useCanvasResize(canvasRef: RefObject<HTMLCanvasElement | null>, onResize?: () => void) {
  useEffect(() => {
    const resize = () => {
      const canvas = canvasRef.current
      if (!canvas) return
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      onResize?.()
    }
    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [canvasRef, onResize])
}
