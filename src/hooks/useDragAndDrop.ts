import { useEffect } from 'react'
import { useDrawingStore } from '../store/useDrawingStore'
import { screenToCanvas } from '../shapes/geometry'
import { uid, randomSeed } from '../utils/uid'
import type { Shape, Point } from '../types'

interface UseDragAndDropProps {
    pan: Point
    zoom: number
    notify: (msg: string) => void
}

export function useDragAndDrop({ pan, zoom, notify }: UseDragAndDropProps) {
    useEffect(() => {
        const handleDragOver = (e: DragEvent) => {
            e.preventDefault()
            e.stopPropagation()
            if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'
        }

        const handleDrop = async (e: DragEvent) => {
            e.preventDefault()
            e.stopPropagation()

            const files = e.dataTransfer?.files
            if (!files || files.length === 0) return

            const { x: dropX, y: dropY } = screenToCanvas(e.clientX, e.clientY, pan, zoom)
            const newItems: Shape[] = []

            // Get styling from store for the imported items
            const state = useDrawingStore.getState()
            const { strokeColor, strokeWidth, fillColor, fontSize, setSelectedIds } = state

            const filePromises = Array.from(files).map((file, i) => {
                if (!file.type.startsWith('image/')) return Promise.resolve()

                return new Promise<void>((resolve) => {
                    const reader = new FileReader()
                    reader.onload = (event) => {
                        const url = event.target?.result as string
                        if (url) {
                            newItems.push({
                                id: uid(), type: 'image',
                                x: dropX + i * 20, y: dropY + i * 20,
                                w: 250, h: 250,
                                imageUrl: url,
                                seed: randomSeed(),
                                strokeColor, strokeWidth, fillColor, fontSize,
                            })
                        }
                        resolve()
                    }
                    reader.readAsDataURL(file)
                })
            })

            await Promise.all(filePromises)

            if (newItems.length > 0) {
                // Fetch latest store state again just in case it changed during async load
                const latestStore = useDrawingStore.getState()
                latestStore.pushHistory([...latestStore.shapes, ...newItems])
                setSelectedIds(newItems.map(s => s.id))
                notify(`Added ${newItems.length} image${newItems.length > 1 ? 's' : ''}`)
            }
        }

        window.addEventListener('dragover', handleDragOver)
        window.addEventListener('drop', handleDrop)
        return () => {
            window.removeEventListener('dragover', handleDragOver)
            window.removeEventListener('drop', handleDrop)
        }
    }, [pan, zoom, notify])
}
