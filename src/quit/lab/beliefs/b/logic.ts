/** Copy B logic: step bar, required checks, the one marked knowledge answer, yearly cost. */

export const BELIEFS = ["relax", "concentrate", "boredom", "stress", "thin", "heroin", "willpower", "withdrawal", "light"] as const
export type BeliefId = (typeof BELIEFS)[number]
export const BELIEF_PAGES: readonly (readonly BeliefId[])[] = [
  ["relax", "concentrate", "boredom"],
  ["stress", "thin", "heroin"],
  ["willpower", "withdrawal", "light"],
]

export const KNOW = ["free", "when", "sixh", "stimulant", "nrt", "spend"] as const
export type KnowId = (typeof KNOW)[number]
export const KNOW_PAGES: readonly (readonly KnowId[])[] = [
  ["free", "when", "sixh"],
  ["stimulant", "nrt", "spend"],
]
/** Option counts per knowledge question. */
export const KNOW_OPTIONS: Record<KnowId, number> = { free: 3, when: 2, sixh: 5, stimulant: 3, nrt: 5, spend: 5 }

/**
 * The only knowledge answer with a key we show. The others are numbers the original gave without
 * a source we can check, and the key to the stimulant question was never seen (inferred).
 */
export const KNOW_KEY: Record<KnowId, number | null> = { free: null, when: 1, sixh: null, stimulant: null, nrt: null, spend: null }

export type Mark = "right" | "wrong" | "unmarked"
export function knowMark(id: KnowId, pick: number | undefined): Mark {
  const key = KNOW_KEY[id]
  if (key === null || pick === undefined) return "unmarked"
  return pick === key ? "right" : "wrong"
}

export const STEPS = 8
/** The bar fills evenly per step (12, 25, 37 ... 100); the original had 9 steps, the copy leaves out the details step. */
export function barPercent(step: number): number {
  return Math.min(100, Math.floor((step * 100) / STEPS))
}

export const AMOUNT_MIDPOINTS = [5.5, 15, 25, 35] as const
/** Cigarettes a day for a band index; undefined when none is picked. */
export function perDay(band: number | undefined): number | undefined {
  return band === undefined ? undefined : AMOUNT_MIDPOINTS[band]
}
/** USD a year at the data file's average price per cigarette, from the band midpoint. */
export function yearCostUsd(band: number | undefined, priceUsd: number): number | undefined {
  const n = perDay(band)
  return n === undefined ? undefined : Math.round(n * priceUsd * 365)
}

export interface Form {
  amount?: number
  tried?: boolean
  tries?: number
  best?: number
  brand?: string
  ratings: Partial<Record<BeliefId, number>>
  know: Partial<Record<KnowId, number>>
}

/** Required questions answered on a step (steps 1 and 8 have none to check). Step 2 is the history, 3-5 the beliefs, 6-7 the knowledge. */
export function stepComplete(step: number, f: Form): boolean {
  if (step === 2) return f.amount !== undefined && f.tried !== undefined
  if (step >= 3 && step <= 5) return BELIEF_PAGES[step - 3].every((b) => f.ratings[b] !== undefined)
  if (step === 6 || step === 7) return KNOW_PAGES[step - 6].every((k) => f.know[k] !== undefined)
  return true
}
