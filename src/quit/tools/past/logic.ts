import type { ViceEndingId } from "@/src/vice/types"
import type { QuitEnding, QuitPlanStep } from "../../types"
import { isTodo } from "../../types"
import { isObj, pickInt, pickOne, pickStrings } from "../common"

export const TRIES = ["0", "1", "2-3", "4-9", "10+"] as const
export type Tries = (typeof TRIES)[number]
export const STRETCH_UNITS = ["days", "weeks", "months", "years"] as const
export type StretchUnit = (typeof STRETCH_UNITS)[number]
export const LAST_ENDED = ["month", "year", "longer"] as const
export const AFTER_SLIP = ["gaveUp", "restarted", "justOnce", "dontRemember"] as const
export type AfterSlip = (typeof AFTER_SLIP)[number]

export const MAX_ENDINGS = 3

export interface PastResult {
  /** Days the longest try lasted, when it was 8 weeks or less. */
  longestDays: number | null
  /** The days to watch, drawn on `curve`. Null for months and years. */
  dangerWindow: { from: number; to: number } | null
  /** The top 2 endings, for `ifthen`. */
  riskyEndings: string[]
  /** What helped, kept in the plan. */
  keep: string[]
}

export interface PastState {
  /** Screens already passed with Continue. */
  done: number
  tries: Tries | null
  stretchN: number
  stretchUnit: StretchUnit | null
  lastEnded: (typeof LAST_ENDED)[number] | null
  endings: string[]
  helped: string[]
  afterSlip: AfterSlip | null
  result: PastResult | null
}

export const EMPTY_PAST: PastState = {
  done: 0,
  tries: null,
  stretchN: 1,
  stretchUnit: null,
  lastEnded: null,
  endings: [],
  helped: [],
  afterSlip: null,
  result: null,
}

/** Saved state, checked. */
export function parsePast(x: unknown): PastState {
  const o = isObj(x) ? x : {}
  let result: PastResult | null = null
  const r = o.result
  if (isObj(r) && Array.isArray(r.riskyEndings) && Array.isArray(r.keep)) {
    const w = r.dangerWindow
    result = {
      longestDays: typeof r.longestDays === "number" && Number.isFinite(r.longestDays) ? r.longestDays : null,
      dangerWindow: isObj(w) && Number.isFinite(w.from) && Number.isFinite(w.to) ? { from: w.from as number, to: w.to as number } : null,
      riskyEndings: pickStrings(r.riskyEndings, []),
      keep: pickStrings(r.keep, []),
    }
  }
  return {
    done: pickInt(o.done, 0, 4, 0),
    tries: pickOne(o.tries, TRIES, null),
    stretchN: pickInt(o.stretchN, 1, 99, 1),
    stretchUnit: pickOne(o.stretchUnit, STRETCH_UNITS, null),
    lastEnded: pickOne(o.lastEnded, LAST_ENDED, null),
    endings: pickStrings(o.endings, []),
    helped: pickStrings(o.helped, []),
    afterSlip: pickOne(o.afterSlip, AFTER_SLIP, null),
    result,
  }
}

/** Picking "never tried" clears every later answer, so none of them can show on the result. */
export function chooseTries(s: PastState, tries: Tries): PastState {
  if (tries !== "0") return { ...s, tries }
  return { ...EMPTY_PAST, done: s.done, tries }
}

/** Screens a run has: one when he has never tried, else four. */
export function totalScreens(tries: Tries | null): number {
  return tries === "0" ? 1 : 4
}

export function firstScreenComplete(s: PastState): boolean {
  if (s.tries === null) return false
  if (s.tries === "0") return true
  return s.stretchUnit !== null && s.lastEnded !== null
}

/** First screen not yet passed (the result when all are). */
export function firstUnanswered(s: PastState): number {
  return Math.min(s.done, totalScreens(s.tries)) + 1
}

const UNIT_DAYS: Record<StretchUnit, number> = { days: 1, weeks: 7, months: 30, years: 365 }

/** The longest stretch in days when it is days or weeks and at most 8 weeks, else null. */
export function longestDays(n: number, unit: StretchUnit): number | null {
  if (unit === "months" || unit === "years") return null
  const days = n * UNIT_DAYS[unit]
  return days >= 1 && days <= 56 ? days : null
}

/** Days ⌈N/2⌉ to N for a longest try of N days; none for months or years. */
export function dangerWindow(n: number, unit: StretchUnit): { from: number; to: number } | null {
  const days = longestDays(n, unit)
  return days === null ? null : { from: Math.ceil(days / 2), to: days }
}

/** Maps picked endings to Black Box endings, once each, in order. */
export function toBlackBoxEndings(ids: string[], endings: Pick<QuitEnding, "id" | "blackBoxEnding">[]): ViceEndingId[] {
  const out: ViceEndingId[] = []
  for (const id of ids) {
    const e = endings.find((x) => x.id === id)
    if (e && !out.includes(e.blackBoxEnding)) out.push(e.blackBoxEnding)
  }
  return out
}

/** The "If you slip …" sentence of the plan's third step, or null. */
export function slipLine(planSteps: QuitPlanStep[] | "TODO" | null | undefined): string | null {
  if (!planSteps || isTodo(planSteps)) return null
  const text = planSteps[2]?.text
  if (typeof text !== "string") return null
  const m = text.match(/If you slip[^.!?]*[.!?]?/)
  return m ? m[0].trim() : null
}

export function buildResult(s: PastState): PastResult {
  const n = s.tries === "0" || s.stretchUnit === null ? null : { n: s.stretchN, unit: s.stretchUnit }
  return {
    longestDays: n ? longestDays(n.n, n.unit) : null,
    dangerWindow: n ? dangerWindow(n.n, n.unit) : null,
    riskyEndings: s.tries === "0" ? [] : s.endings.slice(0, 2),
    keep: s.tries === "0" ? [] : s.helped,
  }
}
