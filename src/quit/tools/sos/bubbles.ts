/** Bubble wrap: a sheet of bubbles, popped or not. */
export const BUBBLE_COUNT = 42

export function freshSheet(): boolean[] {
  return Array<boolean>(BUBBLE_COUNT).fill(false)
}

/** Pops one bubble; a popped bubble stays popped. */
export function pop(sheet: boolean[], i: number): boolean[] {
  return sheet.map((p, j) => (j === i ? true : p))
}

export const poppedCount = (sheet: boolean[]): number => sheet.filter(Boolean).length
export const sheetDone = (sheet: boolean[]): boolean => sheet.length > 0 && sheet.every(Boolean)
