import type { Shape, BoundingBox, ResizeHandle, Point } from '../types'

export function getBoundingBox(shape: Shape): BoundingBox {
  if (shape.type === 'freehand') {
    if (!shape.points || shape.points.length === 0) return { x: 0, y: 0, w: 0, h: 0 }
    const xs = shape.points.map(p => p[0])
    const ys = shape.points.map(p => p[1])
    return {
      x: Math.min(...xs),
      y: Math.min(...ys),
      w: Math.max(...xs) - Math.min(...xs),
      h: Math.max(...ys) - Math.min(...ys),
    }
  }
  if (shape.type === 'line' || shape.type === 'arrow') {
    return {
      x: Math.min(shape.x, shape.x + shape.w),
      y: Math.min(shape.y, shape.y + shape.h),
      w: Math.abs(shape.w),
      h: Math.abs(shape.h),
    }
  }
  return { x: shape.x, y: shape.y, w: Math.abs(shape.w), h: Math.abs(shape.h) }
}

export function pointInShape(px: number, py: number, shape: Shape): boolean {
  const pad = Math.max(8, (shape.strokeWidth || 2) * 2)

  if (shape.type === 'freehand') {
    if (!shape.points) return false
    for (let i = 0; i < shape.points.length - 1; i++) {
      const [ax, ay] = shape.points[i]
      const [bx, by] = shape.points[i + 1]
      const dx = bx - ax, dy = by - ay
      const len = Math.sqrt(dx * dx + dy * dy)
      if (len < 0.001) continue
      const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (len * len)))
      const cx = ax + t * dx, cy = ay + t * dy
      if (Math.sqrt((px - cx) ** 2 + (py - cy) ** 2) < pad + 2) return true
    }
    return false
  }

  if (shape.type === 'line' || shape.type === 'arrow') {
    const x1 = shape.x, y1 = shape.y, x2 = shape.x + shape.w, y2 = shape.y + shape.h
    const dx = x2 - x1, dy = y2 - y1
    const len = Math.sqrt(dx * dx + dy * dy)
    if (len < 0.001) return false
    const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (len * len)))
    const cx = x1 + t * dx, cy = y1 + t * dy
    return Math.sqrt((px - cx) ** 2 + (py - cy) ** 2) < pad + 2
  }

  if (shape.type === 'text') {
    const bb = getBoundingBox(shape)
    return px >= bb.x - pad && px <= bb.x + bb.w + pad && py >= bb.y - 20 && py <= bb.y + bb.h + pad
  }

  if (shape.type === 'ellipse') {
    const cx = shape.x + shape.w / 2, cy = shape.y + shape.h / 2
    const rx = Math.abs(shape.w / 2) + pad, ry = Math.abs(shape.h / 2) + pad
    if (rx < 1 || ry < 1) return false
    return ((px - cx) ** 2) / (rx * rx) + ((py - cy) ** 2) / (ry * ry) <= 1
  }

  const bb = getBoundingBox(shape)
  return px >= bb.x - pad && px <= bb.x + bb.w + pad && py >= bb.y - pad && py <= bb.y + bb.h + pad
}

export function getResizeHandles(bb: BoundingBox): ResizeHandle[] {
  const { x, y, w, h } = bb
  return [
    { id: 'nw', x, y },
    { id: 'n', x: x + w / 2, y },
    { id: 'ne', x: x + w, y },
    { id: 'e', x: x + w, y: y + h / 2 },
    { id: 'se', x: x + w, y: y + h },
    { id: 's', x: x + w / 2, y: y + h },
    { id: 'sw', x, y: y + h },
    { id: 'w', x, y: y + h / 2 },
  ]
}

export function screenToCanvas(sx: number, sy: number, pan: Point, zoom: number): Point {
  return { x: (sx - pan.x) / zoom, y: (sy - pan.y) / zoom }
}

export function getCombinedBB(shapes: Shape[]): BoundingBox {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  shapes.forEach(s => {
    const bb = getBoundingBox(s)
    minX = Math.min(minX, bb.x); minY = Math.min(minY, bb.y)
    maxX = Math.max(maxX, bb.x + bb.w); maxY = Math.max(maxY, bb.y + bb.h)
  })
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY }
}
