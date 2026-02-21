import { useState, useRef, useCallback, type RefObject } from 'react'
import { useDrawingStore } from '../store/useDrawingStore'
import { getPos, pointInShape } from '../shapes/geometry'
import { uid, randomSeed } from '../utils/uid'
import type { Shape } from '../types'

export function useTextTool(canvasRef: RefObject<HTMLCanvasElement | null>) {
    const [textInput, setTextInput] = useState<{ x: number; y: number; sx: number; sy: number } | null>(null)
    const [textValue, setTextValue] = useState('')
    const textInputRef = useRef<HTMLTextAreaElement>(null)

    const commitText = useCallback(() => {
        if (!textInput) return
        const value = textValue.trim()
        if (!value) {
            setTextInput(null)
            setTextValue('')
            return
        }

        const state = useDrawingStore.getState()
        const { fontSize, strokeColor, fontFamily, fontWeight, fontStyle, textAlign, strokeWidth, fillColor, shapes, pushHistory, setSelectedIds } = state

        const lines = value.split('\n')
        const maxLineLength = Math.max(...lines.map(l => l.length))
        const fontSizeVal = fontSize || 20
        const newShape: Shape = {
            id: uid(), type: 'text',
            x: textInput.x, y: textInput.y,
            text: value, strokeColor, fontSize: fontSizeVal,
            fontFamily, fontWeight, fontStyle, textAlign,
            seed: randomSeed(), strokeWidth, fillColor,
            w: Math.max(20, maxLineLength * fontSizeVal * 0.6),
            h: Math.max(20, lines.length * fontSizeVal * 1.2),
        }

        pushHistory([...shapes, newShape])
        setSelectedIds([newShape.id])
        setTextInput(null)
        setTextValue('')
    }, [textInput, textValue])

    const onDoubleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!canvasRef.current) return

        const state = useDrawingStore.getState()
        const { shapes, pan, zoom, setShapes, setFontSize, setFontFamily, setFontWeight, setFontStyle, setTextAlign, setStrokeColor } = state

        const { sx, sy, x, y } = getPos(e, canvasRef.current, pan, zoom)
        const clicked = shapes.find(s => s.type === 'text' && pointInShape(x, y, s))

        if (clicked) {
            setTextInput({ x: clicked.x, y: clicked.y, sx: sx, sy: sy })
            setTextValue(clicked.text || '')

            // Update store settings to match clicked text
            if (clicked.fontSize) setFontSize(clicked.fontSize)
            if (clicked.fontFamily) setFontFamily(clicked.fontFamily)
            if (clicked.fontWeight) setFontWeight(clicked.fontWeight)
            if (clicked.fontStyle) setFontStyle(clicked.fontStyle)
            if (clicked.textAlign) setTextAlign(clicked.textAlign)
            if (clicked.strokeColor) setStrokeColor(clicked.strokeColor)

            setShapes(shapes.filter(s => s.id !== clicked.id))
            setTimeout(() => textInputRef.current?.focus(), 40)
        }
    }, [canvasRef])

    return {
        textInput, setTextInput,
        textValue, setTextValue,
        textInputRef,
        commitText,
        onDoubleClick
    }
}
