import { NEED_IDS, type QuitSwap } from "../../types"

export const MAX_NEEDS = 3

export interface GivesState {
  /** Screens already passed with Continue or Next. */
  done: number
  /** Null until the reader has chosen; then the picked need ids. */
  picked: string[] | null
  /** swapId -> day he said he would try it (YYYY-MM-DD) */
  tried: Record<string, { swapId: string; triedOn: string }>
  /** swapId -> 0..100: how much of the need it gave */
  rated: Record<string, number>
}

export const EMPTY_GIVES: GivesState = { done: 0, picked: null, tried: {}, rated: {} }

/** Keeps known need ids, once each, at most 3. */
export function cleanNeeds(ids: string[], known: readonly string[] = NEED_IDS): string[] {
  const out: string[] = []
  for (const id of ids) if (known.includes(id) && !out.includes(id)) out.push(id)
  return out.slice(0, MAX_NEEDS)
}

/** `?need=` wins; else the needs of the top beliefs (in order); unknown ids are ignored. */
export function preselectNeeds(queryNeed: string | null, topBeliefNeeds: string[], known: readonly string[] = NEED_IDS): string[] {
  const fromQuery = queryNeed ? cleanNeeds(queryNeed.split(","), known) : []
  return fromQuery.length > 0 ? fromQuery : cleanNeeds(topBeliefNeeds, known)
}

/**
 * Swaps in the order he should see them: rated 60 or more first (highest
 * first), then unrated in data order, then 30 to 59, then under 30.
 */
export function orderSwaps(swaps: QuitSwap[], rated: Record<string, number>): QuitSwap[] {
  const pct = (s: QuitSwap): number | null => {
    const r = rated[s.id]
    return typeof r === "number" && r >= 0 && r <= 100 ? r : null
  }
  const withOrder = swaps.map((s, order) => ({ s, order, p: pct(s) }))
  const rank = (p: number | null): number => (p === null ? 1 : p >= 60 ? 0 : p >= 30 ? 2 : 3)
  return withOrder
    .sort((a, b) => {
      const ra = rank(a.p)
      const rb = rank(b.p)
      if (ra !== rb) return ra - rb
      if (ra === 0) return (b.p ?? 0) - (a.p ?? 0) || a.order - b.order
      return a.order - b.order
    })
    .map((x) => x.s)
}

/** The slider shows once a swap was marked on an earlier day. */
export function needsRating(triedOn: string | undefined, today: string): boolean {
  return typeof triedOn === "string" && triedOn < today
}
