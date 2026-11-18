export interface Slice {
  index: number
  path: string
}

/** SVG paths of a pie (radius `r` around 0,0), one slice per non-zero count, starting at the top and going clockwise. */
export function pieSlices(counts: number[], r: number): Slice[] {
  const total = counts.reduce((a, b) => a + b, 0)
  if (total === 0) return []
  const nonZero = counts.map((c, index) => ({ c, index })).filter((s) => s.c > 0)
  if (nonZero.length === 1) {
    const { index } = nonZero[0]
    return [{ index, path: `M0 ${-r} A${r} ${r} 0 1 1 0 ${r} A${r} ${r} 0 1 1 0 ${-r} Z` }]
  }
  let angle = -Math.PI / 2
  return nonZero.map(({ c, index }) => {
    const sweep = (c / total) * Math.PI * 2
    const x1 = r * Math.cos(angle)
    const y1 = r * Math.sin(angle)
    angle += sweep
    const x2 = r * Math.cos(angle)
    const y2 = r * Math.sin(angle)
    const large = sweep > Math.PI ? 1 : 0
    return { index, path: `M0 0 L${x1.toFixed(3)} ${y1.toFixed(3)} A${r} ${r} 0 ${large} 1 ${x2.toFixed(3)} ${y2.toFixed(3)} Z` }
  })
}

/** Next solution card of a situation, wrapping to the first. */
export function nextIndex(current: number, size: number): number {
  return size <= 0 ? 0 : (current + 1) % size
}

export function bump(counts: number[], index: number, by: number): number[] {
  return counts.map((c, i) => (i === index ? Math.max(0, c + by) : c))
}
