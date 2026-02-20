/**
 * Snaps a value to the nearest grid intersection.
 * @param value The value to snap
 * @param gridSize The size of the grid (default: 20)
 * @returns The snapped value
 */
export const snap = (v: number, size: number = 20) => Math.round(v / size) * size
