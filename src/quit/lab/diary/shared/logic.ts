import { DAY, dayKey } from "../../progress/shared/calc"

export { dayKey }

/** Share of one tally in the total, rounded to `decimals` places. */
export function pct(count: number, total: number, decimals = 0): number {
  if (total <= 0) return 0
  const f = 10 ** decimals
  return Math.round((count / total) * 100 * f) / f
}

/** `pct` as text with a fixed number of decimals (two-decimal charts print 33.33, one-decimal 16.7). */
export function pctText(count: number, total: number, decimals = 0): string {
  return pct(count, total, decimals).toFixed(decimals)
}

export interface Share {
  key: string
  count: number
}

/** Tallies of keys, largest first; ties keep the order of first appearance. Zero counts are dropped. */
export function tally(keys: string[]): Share[] {
  const order: string[] = []
  const counts: Record<string, number> = {}
  for (const k of keys) {
    if (!(k in counts)) {
      counts[k] = 0
      order.push(k)
    }
    counts[k] += 1
  }
  return sortShares(order.map((key) => ({ key, count: counts[key] })))
}

export function sortShares(rows: Share[]): Share[] {
  return rows
    .map((r, i) => ({ r, i }))
    .filter(({ r }) => r.count > 0)
    .sort((a, b) => b.r.count - a.r.count || a.i - b.i)
    .map(({ r }) => r)
}

export function sum(rows: { count: number }[]): number {
  return rows.reduce((a, r) => a + r.count, 0)
}

export function mean(nums: number[]): number | null {
  return nums.length === 0 ? null : nums.reduce((a, b) => a + b, 0) / nums.length
}

/** Local-day keys, oldest first, the `n` days that end on `endMs`'s day. */
export function lastDays(endMs: number, n: number): string[] {
  const out: string[] = []
  const end = new Date(endMs)
  for (let i = n - 1; i >= 0; i--) {
    out.push(dayKey(new Date(end.getFullYear(), end.getMonth(), end.getDate() - i, 12).getTime()))
  }
  return out
}

/** Noon of a day key, in ms. */
export function keyMs(key: string): number {
  const [y, m, d] = key.split("-").map(Number)
  return new Date(y, m - 1, d, 12).getTime()
}

/** `YYYY-MM-DD` as `dd.mm.yyyy`. */
export function dotDate(key: string): string {
  const [y, m, d] = key.split("-")
  return `${d}.${m}.${y}`
}

/** `YYYY-MM-DD` as `m/d`. */
export function slashDate(key: string): string {
  const [, m, d] = key.split("-").map(Number)
  return `${m}/${d}`
}

/** Sunday-first week that holds `ms`: seven day keys. */
export function weekOf(ms: number): string[] {
  const d = new Date(ms)
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate() - d.getDay(), 12).getTime()
  return Array.from({ length: 7 }, (_, i) => dayKey(start + i * DAY))
}

/** Top of a y axis: the next whole number at or above the data, at least `floor`. */
export function axisMax(values: number[], floor: number): number {
  return Math.max(floor, Math.ceil(Math.max(0, ...values)))
}

/** A smooth path (Catmull-Rom turned into cubic curves) through points. */
export function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length === 0) return ""
  if (pts.length === 1) return `M${pts[0].x} ${pts[0].y}`
  let d = `M${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[i + 2] ?? p2
    const c1x = p1.x + (p2.x - p0.x) / 6
    const c1y = p1.y + (p2.y - p0.y) / 6
    const c2x = p2.x - (p3.x - p1.x) / 6
    const c2y = p2.y - (p3.y - p1.y) / 6
    d += ` C${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`
  }
  return d
}

/** Consecutive days at the end of the list with zero urges. */
export function trailingZeroDays(urges: number[]): number {
  let n = 0
  for (let i = urges.length - 1; i >= 0 && urges[i] === 0; i--) n += 1
  return n
}

/** Deterministic pseudo-random 0..1 for the example data (no Math.random: same shots every run). */
export function rnd(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 233280
  return x - Math.floor(x)
}

/** Donut slice paths: ring between radii `r0` and `r1`, starting at the top, clockwise; with mid-angles for labels. */
export interface Arc {
  index: number
  path: string
  mid: number
}
export function ringArcs(counts: number[], r0: number, r1: number): Arc[] {
  const total = counts.reduce((a, b) => a + b, 0)
  if (total === 0) return []
  const rows = counts.map((c, index) => ({ c, index })).filter((s) => s.c > 0)
  const pt = (r: number, a: number) => `${(r * Math.cos(a)).toFixed(2)} ${(r * Math.sin(a)).toFixed(2)}`
  if (rows.length === 1) {
    const { index } = rows[0]
    return [{ index, mid: -Math.PI / 2, path: `M0 ${-r1} A${r1} ${r1} 0 1 1 0 ${r1} A${r1} ${r1} 0 1 1 0 ${-r1} Z M0 ${-r0} A${r0} ${r0} 0 1 0 0 ${r0} A${r0} ${r0} 0 1 0 0 ${-r0} Z` }]
  }
  let a = -Math.PI / 2
  return rows.map(({ c, index }) => {
    const sweep = (c / total) * Math.PI * 2
    const a2 = a + sweep
    const large = sweep > Math.PI ? 1 : 0
    const path = `M${pt(r1, a)} A${r1} ${r1} 0 ${large} 1 ${pt(r1, a2)} L${pt(r0, a2)} A${r0} ${r0} 0 ${large} 0 ${pt(r0, a)} Z`
    const mid = a + sweep / 2
    a = a2
    return { index, path, mid }
  })
}
