import type { QuitBelief, QuitNeed, QuitSwap } from "../../types"
import { orderSwaps } from "../gives/logic"

export const WAIT_MS = 10 * 60 * 1000
export const OTHER = "other"

export interface SosState {
  /** Screens passed with a tap. */
  done: number
  /** A belief id, or "other"; null until chosen. */
  belief: string | null
  /** A need id; null until chosen. */
  need: string | null
  /** Which of the need's swaps is on show. */
  swapIdx: number
  /** Epoch ms when the wait began; null when none runs. */
  waitStartedAt: number | null
  sound: boolean
  passed: boolean | null
  /** Black Box report id of the close call filed from this run. */
  reportId: string | null
}

export const EMPTY_SOS: SosState = {
  done: 0,
  belief: null,
  need: null,
  swapIdx: 0,
  waitStartedAt: null,
  sound: false,
  passed: null,
  reportId: null,
}

/** Milliseconds left of the wait at `now`; 0 when over, the full time for a start in the future. */
export function remainingMs(startedAt: number, now: number): number {
  return Math.min(WAIT_MS, Math.max(0, WAIT_MS - (now - startedAt)))
}

/** mm:ss, rounded up to the second so 00:00 shows only at the very end. */
export function formatClock(ms: number): string {
  const total = Math.ceil(Math.max(0, ms) / 1000)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
}

/** Whole minutes of the wait that have gone by at `now`. */
export function minutesGone(startedAt: number, now: number): number {
  return Math.floor((WAIT_MS - remainingMs(startedAt, now)) / 60000)
}

/** The need a belief points to, or null for "something else" and unknown or draft ids. */
export function needForBelief(beliefId: string | null, beliefs: Pick<QuitBelief, "id" | "need">[]): string | null {
  if (!beliefId || beliefId === OTHER) return null
  const n = beliefs.find((b) => b.id === beliefId)?.need
  return typeof n === "string" && n !== "TODO" ? n : null
}

/** The swap on show: the need's swaps in `gives` order, picked by a counter that wraps. */
export function currentSwap(need: Pick<QuitNeed, "swaps"> | undefined, rated: Record<string, number>, idx: number): QuitSwap | null {
  if (!need || need.swaps.length === 0) return null
  const ordered = orderSwaps(need.swaps, rated)
  return ordered[((idx % ordered.length) + ordered.length) % ordered.length]
}

/** First screen without an answer (1 to 5; 5 is the result). */
export function firstUnanswered(s: SosState): number {
  return Math.min(s.done, 4) + 1
}
