import rough from 'roughjs'
import type { RoughCanvas } from 'roughjs/bin/canvas'
import type { Options } from 'roughjs/bin/core'
import type { Shape, BoundingBox, Point } from '../types'
import { getBoundingBox, getResizeHandles, getCombinedBB } from './geometry'

const ROUGHNESS = 1.2
const BOWING = 2
const FILL_STYLE = 'hachure'

function makeOpts(shape: Shape): Options {
  const opts: Options = {
    roughness: ROUGHNESS,
    bowing: BOWING,
    stroke: shape.strokeColor || '#1a1a2e',
    strokeWidth: shape.strokeWidth || 2,
    seed: shape.seed || 1,
  }
  if (shape.fillColor && shape.fillColor !== 'none') {
    opts.fill = shape.fillColor
    opts.fillStyle = FILL_STYLE
    opts.fillWeight = 1.2
    opts.hachureAngle = -41
    opts.hachureGap = 6
  }
  return opts
}

const imageCache = new Map<string, HTMLImageElement>()

export function renderShape(rc: RoughCanvas, ctx: CanvasRenderingContext2D, shape: Shape, isSelected: boolean) {
  const opts = makeOpts(shape)
  ctx.save()
  if (isSelected) {
    ctx.shadowColor = 'rgba(59,130,246,0.35)'
    ctx.shadowBlur = 10
  }

  switch (shape.type) {
    case 'rect':
      rc.rectangle(shape.x, shape.y, shape.w, shape.h, opts)
      break

    case 'ellipse': {
      const cx = shape.x + shape.w / 2
      const cy = shape.y + shape.h / 2
      rc.ellipse(cx, cy, Math.abs(shape.w), Math.abs(shape.h), opts)
      break
    }

    case 'line':
      rc.line(shape.x, shape.y, shape.x + shape.w, shape.y + shape.h, opts)
      break

    case 'arrow': {
      const x1 = shape.x, y1 = shape.y
      const x2 = shape.x + shape.w, y2 = shape.y + shape.h
      rc.line(x1, y1, x2, y2, opts)
      const angle = Math.atan2(y2 - y1, x2 - x1)
      const aLen = 16
      rc.line(x2, y2, x2 - aLen * Math.cos(angle - 0.4), y2 - aLen * Math.sin(angle - 0.4), opts)
      rc.line(x2, y2, x2 - aLen * Math.cos(angle + 0.4), y2 - aLen * Math.sin(angle + 0.4), opts)
      break
    }

    case 'freehand': {
      if (!shape.points || shape.points.length < 2) break
      try {
        rc.curve(shape.points, { ...opts, fillStyle: 'none', fill: undefined })
      } catch {
        ctx.beginPath()
        ctx.strokeStyle = opts.stroke as string
        ctx.lineWidth = opts.strokeWidth as number
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        ctx.moveTo(shape.points[0][0], shape.points[0][1])
        for (let i = 1; i < shape.points.length; i++) ctx.lineTo(shape.points[i][0], shape.points[i][1])
        ctx.stroke()
      }
      break
    }

    case 'text': {
      ctx.font = `${shape.fontSize || 20}px 'Caveat', cursive`
      ctx.fillStyle = shape.strokeColor || '#1a1a2e'
      ctx.textBaseline = 'top'
        ; (shape.text || '').split('\n').forEach((line, i) => {
          ctx.fillText(line, shape.x, shape.y + i * (shape.fontSize || 20) * 1.3)
        })
      break
    }

    case 'image': {
      if (!shape.imageUrl) break
      let img = imageCache.get(shape.imageUrl)
      if (!img) {
        img = new Image()
        img.src = shape.imageUrl
        img.onload = () => { /* triggers re-draw on next frame usually via App loop */ }
        imageCache.set(shape.imageUrl, img)
      }
      if (img.complete && img.naturalHeight !== 0) {
        // Draw the image
        ctx.drawImage(img, shape.x + 4, shape.y + 4, shape.w - 8, shape.h - 8)
      }
      // Sketchy border
      if (!shape.noBorder) {
        rc.rectangle(shape.x, shape.y, shape.w, shape.h, { ...opts, fill: undefined })
      }
      break
    }

    // ── Library shapes ──────────────────────────────────────────────────────

    case 'diamond': {
      const cx = shape.x + shape.w / 2, cy = shape.y + shape.h / 2
      rc.polygon([[cx, shape.y], [shape.x + shape.w, cy], [cx, shape.y + shape.h], [shape.x, cy]], opts)
      break
    }

    case 'triangle':
      rc.polygon([
        [shape.x + shape.w / 2, shape.y],
        [shape.x + shape.w, shape.y + shape.h],
        [shape.x, shape.y + shape.h],
      ], opts)
      break

    case 'hexagon': {
      const hcx = shape.x + shape.w / 2, hcy = shape.y + shape.h / 2
      const hr = Math.min(shape.w, shape.h) / 2
      const pts: [number, number][] = []
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i - Math.PI / 6
        pts.push([hcx + hr * Math.cos(a), hcy + hr * Math.sin(a)])
      }
      rc.polygon(pts, opts)
      break
    }

    case 'star': {
      const scx = shape.x + shape.w / 2, scy = shape.y + shape.h / 2
      const outerR = Math.min(shape.w, shape.h) / 2
      const innerR = outerR * 0.4
      const spts: [number, number][] = []
      for (let i = 0; i < 10; i++) {
        const a = (Math.PI / 5) * i - Math.PI / 2
        const r = i % 2 === 0 ? outerR : innerR
        spts.push([scx + r * Math.cos(a), scy + r * Math.sin(a)])
      }
      rc.polygon(spts, opts)
      break
    }

    case 'database': {
      const ry = Math.min(18, shape.h * 0.15)
      const cx = shape.x + shape.w / 2
      rc.ellipse(cx, shape.y + ry, shape.w, ry * 2, opts)
      rc.rectangle(shape.x, shape.y + ry, shape.w, shape.h - ry, opts)
      rc.ellipse(cx, shape.y + shape.h, shape.w, ry * 2, { ...opts, fill: undefined })
      break
    }

    case 'bubble': {
      const bh = shape.h * 0.78
      rc.rectangle(shape.x, shape.y, shape.w, bh, opts)
      rc.polygon([
        [shape.x + 20, shape.y + bh],
        [shape.x + 12, shape.y + shape.h],
        [shape.x + 44, shape.y + bh],
      ], opts)
      break
    }

    case 'cylinder': {
      const cry = Math.min(18, shape.h * 0.15)
      const ccx = shape.x + shape.w / 2
      rc.ellipse(ccx, shape.y + cry, shape.w, cry * 2, opts)
      rc.rectangle(shape.x, shape.y + cry, shape.w, shape.h - cry * 2, opts)
      rc.ellipse(ccx, shape.y + shape.h - cry, shape.w, cry * 2, opts)
      break
    }

    case 'browser': {
      rc.rectangle(shape.x, shape.y, shape.w, shape.h, opts)
      rc.line(shape.x, shape.y + 28, shape.x + shape.w, shape.y + 28, opts)
      rc.ellipse(shape.x + Math.min(60, shape.w * 0.45), shape.y + 14, Math.min(80, shape.w * 0.55), 14, opts)
      rc.ellipse(shape.x + 14, shape.y + 14, 10, 10, opts)
      rc.ellipse(shape.x + 28, shape.y + 14, 10, 10, opts)
      break
    }

    case 'arrowRight': {
      const my = shape.y + shape.h / 2
      const shaft = shape.h * 0.3
      rc.polygon([
        [shape.x, my - shaft],
        [shape.x + shape.w * 0.62, my - shaft],
        [shape.x + shape.w * 0.62, shape.y],
        [shape.x + shape.w, my],
        [shape.x + shape.w * 0.62, shape.y + shape.h],
        [shape.x + shape.w * 0.62, my + shaft],
        [shape.x, my + shaft],
      ], opts)
      break
    }
  }

  ctx.restore()
}

export function drawGrid(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  pan: Point,
  zoom: number,
  gridType: 'none' | 'dot' | 'line'
) {
  if (gridType === 'none') return

  const gridSize = 20 * zoom
  const offsetX = ((pan.x % gridSize) + gridSize) % gridSize
  const offsetY = ((pan.y % gridSize) + gridSize) % gridSize

  ctx.strokeStyle = 'rgba(0,0,0,0.055)'
  ctx.fillStyle = 'rgba(0,0,0,0.1)'
  ctx.lineWidth = 1

  if (gridType === 'line') {
    ctx.setLineDash([1, 3])
    for (let x = offsetX - gridSize; x < width + gridSize; x += gridSize) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke()
    }
    for (let y = offsetY - gridSize; y < height + gridSize; y += gridSize) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke()
    }
    ctx.setLineDash([])
  } else if (gridType === 'dot') {
    for (let x = offsetX - gridSize; x < width + gridSize; x += gridSize) {
      for (let y = offsetY - gridSize; y < height + gridSize; y += gridSize) {
        ctx.beginPath()
        ctx.arc(x, y, 0.8 * zoom, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  }
}

export function drawSelectionBox(
  ctx: CanvasRenderingContext2D,
  bb: BoundingBox,
  zoom: number,
  pan: Point
) {
  const pad = 9
  const sx = bb.x * zoom + pan.x - pad
  const sy = bb.y * zoom + pan.y - pad
  const sw = bb.w * zoom + pad * 2
  const sh = bb.h * zoom + pad * 2

  ctx.strokeStyle = '#3b82f6'
  ctx.lineWidth = 1.5
  ctx.setLineDash([5, 3])
  ctx.strokeRect(sx, sy, sw, sh)
  ctx.setLineDash([])

  getResizeHandles({ x: sx, y: sy, w: sw, h: sh }).forEach(h => {
    ctx.fillStyle = '#fff'
    ctx.strokeStyle = '#3b82f6'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.arc(h.x, h.y, 5, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
  })
}

export function drawLasso(ctx: CanvasRenderingContext2D, lasso: Point[]) {
  if (lasso.length < 2) return
  ctx.strokeStyle = '#3b82f6'
  ctx.lineWidth = 1
  ctx.setLineDash([4, 3])
  ctx.fillStyle = 'rgba(59,130,246,0.05)'
  ctx.beginPath()
  ctx.moveTo(lasso[0].x, lasso[0].y)
  lasso.forEach(p => ctx.lineTo(p.x, p.y))
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  ctx.setLineDash([])
}

export function renderAll(
  canvas: HTMLCanvasElement,
  shapes: Shape[],
  currentShape: Shape | null,
  selectedIds: string[],
  pan: Point,
  zoom: number,
  lasso: Point[] | null,
  isDrawing: boolean,
  bg: { type: 'solid' | 'paper'; color: string; grid: 'none' | 'dot' | 'line' }
) {
  const ctx = canvas.getContext('2d')!
  const rc = rough.canvas(canvas)
  const { width: w, height: h } = canvas

  ctx.clearRect(0, 0, w, h)

  // 1. Background Color
  ctx.fillStyle = bg.color
  ctx.fillRect(0, 0, w, h)

  // 2. Paper Texture override
  if (bg.type === 'paper') {
    ctx.save()
    ctx.globalCompositeOperation = 'multiply'
    ctx.globalAlpha = 0.04
    // Draw a subtle grain/paper effect using random noise
    // For performance we could use a static pattern, but let's try a simple noise first
    const grainSize = 2
    for (let i = 0; i < w; i += grainSize) {
      for (let j = 0; j < h; j += grainSize) {
        if (Math.random() > 0.5) {
          ctx.fillStyle = '#000'
          ctx.fillRect(i, j, grainSize, grainSize)
        }
      }
    }
    ctx.restore()
  }

  // 3. Grid
  drawGrid(ctx, w, h, pan, zoom, bg.grid)

  ctx.save()
  ctx.translate(pan.x, pan.y)
  ctx.scale(zoom, zoom)

  shapes.forEach(s => renderShape(rc, ctx, s, selectedIds.includes(s.id)))
  if (currentShape) renderShape(rc, ctx, currentShape, false)

  ctx.restore()

  // Selection UI in screen space
  if (selectedIds.length > 0 && !isDrawing) {
    const sel = shapes.filter(s => selectedIds.includes(s.id))
    if (sel.length > 0) {
      const bb = sel.length === 1 ? getBoundingBox(sel[0]) : getCombinedBB(sel)
      drawSelectionBox(ctx, bb, zoom, pan)
    }
  }

  if (lasso) drawLasso(ctx, lasso)
}
