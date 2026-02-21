interface Props {
  zoom: number
  sidebarOpen: boolean
  isMobile: boolean
  onZoomIn: () => void
  onZoomOut: () => void
  onReset: () => void
  onFitContent: () => void
}

export default function ZoomControls({ zoom, sidebarOpen, isMobile, onZoomIn, onZoomOut, onReset, onFitContent }: Props) {
  return (
    <div style={{
      position: 'absolute', bottom: 20,
      left: sidebarOpen && !isMobile
        ? `calc(50% - 126px)`
        : '50%',
      transform: 'translateX(-50%)',
      display: 'flex', gap: 5, alignItems: 'center',
      background: '#faf9f6', border: '2px solid #1a1a2e',
      borderRadius: 8, boxShadow: '2px 2px 0 #1a1a2e',
      padding: '5px 10px', zIndex: 50,
      transition: 'left 0.2s, bottom 0.2s',
      fontFamily: "'Caveat', cursive",
      maxWidth: '90vw'
    }}>
      <button onClick={onZoomOut} className="sketchy-btn" style={{ padding: '1px 9px', fontSize: 17, lineHeight: 1 }}>−</button>
      <span style={{ minWidth: 50, textAlign: 'center', fontSize: 13, color: '#555' }}>
        {Math.round(zoom * 100)}%
      </span>
      <button onClick={onZoomIn} className="sketchy-btn" style={{ padding: '1px 9px', fontSize: 17, lineHeight: 1 }}>+</button>
      <div style={{ width: 1, height: 18, background: '#ddd', margin: '0 2px' }} />
      <button onClick={onReset} className="sketchy-btn" style={{ padding: '2px 7px', fontSize: 13 }} title="Reset view">⌂</button>
      <button onClick={onFitContent} className="sketchy-btn" style={{ padding: '2px 7px', fontSize: 13 }} title="Fit to content">⊡</button>
    </div>
  )
}
