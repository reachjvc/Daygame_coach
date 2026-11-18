import type { QuitBand, QuitBelief } from "../../types"

export interface BeliefsState {
  /** beliefId -> 1..5 */
  ratings: Record<string, number>
  /** factId -> what the reader answered */
  facts: Record<string, boolean>
}

export const EMPTY_BELIEFS: BeliefsState = { ratings: {}, facts: {} }

export const MAX_TOP = 3
export const MAX_HELD = 12

const rated = (ratings: Record<string, number>, id: string): number | null => {
  const r = ratings[id]
  return Number.isInteger(r) && r >= 1 && r <= 5 ? r : null
}

/** Beliefs rated 3 or more, highest first, ties in data order, at most 3. */
export function topBeliefs<B extends Pick<QuitBelief, "id">>(ratings: Record<string, number>, beliefs: B[]): B[] {
  return beliefs
    .map((b, order) => ({ b, order, r: rated(ratings, b.id) }))
    .filter((x): x is { b: B; order: number; r: number } => x.r !== null && x.r >= 3)
    .sort((a, b) => b.r - a.r || a.order - b.order)
    .slice(0, MAX_TOP)
    .map((x) => x.b)
}

/** Beliefs rated 1 or 2, in data order. */
export function seeThrough<B extends Pick<QuitBelief, "id">>(ratings: Record<string, number>, beliefs: B[]): B[] {
  return beliefs.filter((b) => {
    const r = rated(ratings, b.id)
    return r !== null && r <= 2
  })
}

/** How many beliefs were rated 4 or 5. */
export function heldCount(ratings: Record<string, number>, beliefs: Pick<QuitBelief, "id">[]): number {
  return beliefs.filter((b) => (rated(ratings, b.id) ?? 0) >= 4).length
}

export function bandFor(held: number, bands: QuitBand[]): QuitBand | null {
  return bands.find((b) => held >= b.min && held <= b.max) ?? null
}

/** The first screen without an answer; `beliefs + facts + 1` when all are answered. */
export function firstUnanswered(state: BeliefsState, beliefs: Pick<QuitBelief, "id">[], facts: { id: string }[]): number {
  for (let i = 0; i < beliefs.length; i++) if (rated(state.ratings, beliefs[i].id) === null) return i + 1
  for (let i = 0; i < facts.length; i++) if (typeof state.facts[facts[i].id] !== "boolean") return beliefs.length + i + 1
  return beliefs.length + facts.length + 1
}

/** The page a shared result points to. */
export function shareUrl(origin: string, addiction: string): string {
  return `${origin}/quit/${addiction}/beliefs`
}

export function cardPath(addiction: string, held: number): string {
  return `/quit/${addiction}/card?held=${held}`
}

/** The `held` query of the share card: an integer 0 to 12, else null. */
export function parseHeld(raw: string | null): number | null {
  if (raw === null || !/^(0|[1-9]\d?)$/.test(raw)) return null
  const n = Number(raw)
  return n <= MAX_HELD ? n : null
}
