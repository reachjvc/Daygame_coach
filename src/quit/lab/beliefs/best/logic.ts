import type { QuitBand, QuitBelief } from "../../../types"
import { isObj, pickRecord } from "../../../tools/common"
import { bandFor, heldCount, topBeliefs } from "../../../tools/beliefs/logic"

export type CanStop = "yes" | "unsure" | "no"
export const CAN_STOP: readonly CanStop[] = ["yes", "unsure", "no"]

/** One finished test, kept with the day it was taken. */
export interface BeliefResult {
  on: string
  ratings: Record<string, number>
  fears: string[]
  noneOfThese: boolean
  canStop: CanStop | null
}

/** The test in progress. `step` 1..12 are the beliefs, then the fears screen, then the last question. */
export interface Draft {
  step: number
  /** The reply to an agreed belief is open. */
  reply: boolean
  ratings: Record<string, number>
  fears: string[]
  noneOfThese: boolean
  canStop: CanStop | null
}

export const MAX_RESULTS = 10

export function freshDraft(): Draft {
  return { step: 1, reply: false, ratings: {}, fears: [], noneOfThese: false, canStop: null }
}

const isRating = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v) && v >= 1 && v <= 5
const isDay = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v)

/** Saved results, checked: bad entries are dropped, the oldest go past the cap. */
export function parseResults(x: unknown): BeliefResult[] {
  if (!Array.isArray(x)) return []
  const out: BeliefResult[] = []
  for (const r of x) {
    if (!isObj(r) || !isDay(r.on)) continue
    out.push({
      on: r.on,
      ratings: pickRecord(r.ratings, isRating),
      fears: Array.isArray(r.fears) ? r.fears.filter((f): f is string => typeof f === "string") : [],
      noneOfThese: r.noneOfThese === true,
      canStop: CAN_STOP.includes(r.canStop as CanStop) ? (r.canStop as CanStop) : null,
    })
  }
  return out.slice(-MAX_RESULTS)
}

/** Earlier results stay; the new one goes last. */
export function addResult(results: BeliefResult[], next: BeliefResult): BeliefResult[] {
  return [...results, next].slice(-MAX_RESULTS)
}

/** An agreed belief (4 or 5) gets a reply; 1 to 3 moves on. */
export function wantsReply(rating: number): boolean {
  return rating >= 4
}

/** Beliefs he can name as fears: the ones of kind hard and stuck, in data order. */
export function fearCandidates<B extends Pick<QuitBelief, "kind">>(beliefs: B[]): B[] {
  return beliefs.filter((b) => b.kind === "hard" || b.kind === "stuck")
}

/** Screens: one per belief, the fears screen, the last question. */
export function totalSteps(beliefCount: number): number {
  return beliefCount + 2
}

export function toggleFear(fears: string[], id: string): string[] {
  return fears.includes(id) ? fears.filter((f) => f !== id) : [...fears, id]
}

export function toResult(d: Draft, on: string): BeliefResult {
  return { on, ratings: d.ratings, fears: d.fears, noneOfThese: d.noneOfThese, canStop: d.canStop }
}

/** Count of held beliefs, the band for it and the top three. */
export function summarize<B extends Pick<QuitBelief, "id">>(ratings: Record<string, number>, beliefs: B[], bands: QuitBand[]) {
  const held = heldCount(ratings, beliefs)
  return { held, band: bandFor(held, bands), top: topBeliefs(ratings, beliefs) }
}
