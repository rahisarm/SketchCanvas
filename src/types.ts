export type ToolType =
  | 'select'
  | 'freehand'
  | 'rect'
  | 'ellipse'
  | 'arrow'
  | 'line'
  | 'text'
  | 'eraser'

export type ShapeType =
  | 'freehand'
  | 'rect'
  | 'ellipse'
  | 'arrow'
  | 'line'
  | 'text'
  | 'diamond'
  | 'triangle'
  | 'hexagon'
  | 'star'
  | 'database'
  | 'bubble'
  | 'cylinder'
  | 'browser'
  | 'arrowRight'
  | 'image'

export interface Shape {
  id: string
  type: ShapeType
  x: number
  y: number
  w: number
  h: number
  seed: number
  strokeColor: string
  strokeWidth: number
  fillColor: string
  // freehand
  points?: [number, number][]
  // text
  text?: string
  fontSize?: number
  fontFamily?: string
  fontWeight?: string
  fontStyle?: string
  textAlign?: 'left' | 'center' | 'right'
  imageUrl?: string
  noBorder?: boolean
}

export interface BoundingBox {
  x: number
  y: number
  w: number
  h: number
}

export interface Point {
  x: number
  y: number
}

export interface ResizeHandle {
  id: string
  x: number
  y: number
}

export interface DragOrigin {
  id: string
  x: number
  y: number
  w: number
  h: number
  points?: [number, number][]
}

export interface LibraryItem {
  name: string
  icon: string
  shapeType: ShapeType
  points?: [number, number][]
  imageUrl?: string
}

export type GridType = 'none' | 'dot' | 'line'
export type BackgroundType = 'solid' | 'paper'

export interface BackgroundSettings {
  type: BackgroundType
  color: string
  grid: GridType
}
