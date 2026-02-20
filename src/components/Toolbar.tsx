// React
import type { ToolType } from '../types'

const COLORS = [
  '#1a1a2e', '#e53e3e', '#3182ce', '#38a169',
  '#d69e2e', '#805ad5', '#ed8936', '#e53e8c',
]

interface Props {
  tool: ToolType
  strokeColor: string
  strokeWidth: number
  onTool: (t: ToolType) => void
  onColor: (c: string) => void
  onWidth: (w: number) => void
}

const TOOLS: { id: ToolType; icon: string; label: string }[] = [
  { id: 'select', icon: '↖', label: 'Select (V)' },
  { id: 'freehand', icon: '✏️', label: 'Freehand (F)' },
  { id: 'rect', icon: '▭', label: 'Rectangle (R)' },
  { id: 'ellipse', icon: '⬭', label: 'Ellipse (E)' },
  { id: 'arrow', icon: '→', label: 'Arrow (A)' },
  { id: 'line', icon: '╱', label: 'Line (L)' },
  { id: 'text', icon: 'T', label: 'Text (T)' },
  { id: 'eraser', icon: '⌫', label: 'Eraser (X)' },
]

const SEP = <div style={{ width: 1, height: 24, background: '#1a1a2e', margin: '0 4px', opacity: 0.3 }} />

export default function Toolbar({ tool, strokeColor, strokeWidth, onTool, onColor, onWidth }: Props) {
  return (
    <div
      style={{
        position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
        display: 'flex', gap: 3, padding: '7px 10px',
        background: '#faf9f6', border: '2px solid #1a1a2e',
        borderRadius: 10, boxShadow: '3px 3px 0 #1a1a2e',
        zIndex: 50, alignItems: 'center',
      }}
    >
      {TOOLS.map(tb => (
        <button
          key={tb.id}
          title={tb.label}
          onClick={() => onTool(tb.id)}
          className={`tool-btn${tool === tb.id ? ' active' : ''}`}
        >
          {tb.icon}
        </button>
      ))}

      {SEP}

      {COLORS.map(c => (
        <div
          key={c}
          onClick={() => onColor(c)}
          title={c}
          style={{
            width: 20, height: 20, borderRadius: '50%', background: c,
            cursor: 'pointer', flexShrink: 0,
            border: strokeColor === c ? '3px solid #3b82f6' : '2px solid rgba(0,0,0,0.18)',
            transition: 'transform 0.1s',
          }}
        />
      ))}

      <input
        type="color"
        value={strokeColor}
        onChange={e => onColor(e.target.value)}
        title="Custom color"
        style={{ width: 22, height: 22 }}
      />

      {SEP}

      <input
        type="range" min={1} max={14} step={1} value={strokeWidth}
        onChange={e => onWidth(Number(e.target.value))}
        style={{ width: 62 }}
        title={`Stroke: ${strokeWidth}px`}
      />
      <span style={{ fontSize: 12, color: '#777', minWidth: 16, fontFamily: "'Caveat', cursive" }}>
        {strokeWidth}
      </span>
    </div>
  )
}
