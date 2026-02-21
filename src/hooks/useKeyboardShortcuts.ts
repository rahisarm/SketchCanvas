import { useEffect } from 'react'
import { useDrawingStore } from '../store/useDrawingStore'

interface UseKeyboardShortcutsProps {
    isTextInputActive: boolean
    notify: (msg: string) => void
}

export function useKeyboardShortcuts({ isTextInputActive, notify }: UseKeyboardShortcutsProps) {
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (isTextInputActive) return
            const tag = (e.target as HTMLElement).tagName
            if (tag === 'INPUT' || tag === 'TEXTAREA') return

            const state = useDrawingStore.getState()
            const {
                shapes, selectedIds, tool,
                undo, redo, setTool, setSelectedIds, deleteSelected,
                copySelected, paste, nudgeSelected,
                bringToFront, bringForward, sendToBack, sendBackward
            } = state

            // Ctrl shortcuts
            if (e.ctrlKey || e.metaKey) {
                if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); notify('Undo'); return }
                if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) { e.preventDefault(); redo(); notify('Redo'); return }
                if (e.key === 'a') { e.preventDefault(); setSelectedIds(shapes.map(s => s.id)); return }
                if (e.key === 'c') { e.preventDefault(); copySelected(); notify('Copied'); return }
                if (e.key === 'v') { e.preventDefault(); paste(); notify('Pasted'); return }
                return
            }

            const toolMap: Record<string, typeof tool> = {
                v: 'select', f: 'freehand', r: 'rect', e: 'ellipse',
                a: 'arrow', l: 'line', t: 'text', x: 'eraser',
            }
            if (toolMap[e.key]) { setTool(toolMap[e.key]); return }
            if (e.key === 'Delete' || e.key === 'Backspace') { deleteSelected(); return }
            if (e.key === 'Escape') { setSelectedIds([]); setTool('select'); return }

            // Nudge
            if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key) && selectedIds.length > 0) {
                e.preventDefault()
                const d = e.shiftKey ? 10 : 1
                const dx = e.key === 'ArrowLeft' ? -d : e.key === 'ArrowRight' ? d : 0
                const dy = e.key === 'ArrowUp' ? -d : e.key === 'ArrowDown' ? d : 0
                nudgeSelected(dx, dy)
                return
            }

            if (selectedIds.length > 0) {
                if (e.key === ']') {
                    e.preventDefault()
                    if (e.shiftKey) { bringToFront(); notify('Bring to Front') }
                    else { bringForward(); notify('Bring Forward') }
                }
                if (e.key === '[') {
                    e.preventDefault()
                    if (e.shiftKey) { sendToBack(); notify('Send to Back') }
                    else { sendBackward(); notify('Send Backward') }
                }
            }
        }

        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [isTextInputActive, notify])
}
