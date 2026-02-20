import type { Shape } from '../types'

export function exportPNG(canvas: HTMLCanvasElement) {
  const link = document.createElement('a')
  link.download = 'sketchcanvas.png'
  link.href = canvas.toDataURL('image/png', 1.0)
  link.click()
}

export function exportJSON(shapes: Shape[]) {
  const data = JSON.stringify({ shapes, version: 1 }, null, 2)
  const blob = new Blob([data], { type: 'application/json' })
  const link = document.createElement('a')
  link.download = 'sketchcanvas.json'
  link.href = URL.createObjectURL(blob)
  link.click()
}

export function importJSON(file: File): Promise<Shape[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target!.result as string)
        resolve((data.shapes as Shape[]) || [])
      } catch {
        reject(new Error('Invalid JSON'))
      }
    }
    reader.readAsText(file)
  })
}
