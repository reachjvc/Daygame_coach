import type { QuitBelief } from "../../types"
import { isObj, pickRecord } from "../common"
import { parseBeliefs, type BeliefsState } from "./logic"

/** The answer to "Do you believe you can stop?". */
export type CanStop = "yes" | "unsure" | "no"
export const CAN_STOP: readonly CanStop[] = ["yes", "unsure", "no"]

/** One finished test. `at` is the ISO date-time it was finished; null for a wave-1 save made before the date was kept. */
export interface BeliefResult {
  at: string | null
  ratings: Record<string, number>
  facts: Record<string, boolean>
  canStop: CanStop | null
}

/** The test in progress. A draft with no answers and some results is a retake that has not begun. */
export interface Draft {
  ratings: Record<string, number>
  facts: Record<string, boolean>
  canStop: CanStop | null
  startedAt: string | null
}

/**
 * Saved state of the tool. `ratings` and `facts` are the latest finished test, in the shape the
 * slip and gives tools have always read through `parseBeliefs`.
 */
export interface BeliefsFull extends BeliefsState {
  draft: Draft | null
  results: BeliefResult[]
}

export const MAX_RESULTS = 20
export const EMPTY_FULL: BeliefsFull = { ratings: {}, facts: {}, draft: null, results: [] }
export const IMAGE_FILE = "12-lies-result.png"

const isRating = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v) && v >= 1 && v <= 5
const isBool = (v: unknown): v is boolean => typeof v === "boolean"
const isAt = (v: unknown): v is string => typeof v === "string" && !Number.isNaN(Date.parse(v))
const pickCanStop = (v: unknown): CanStop | null => (CAN_STOP as readonly unknown[]).includes(v) ? (v as CanStop) : null

function parseResult(x: unknown): BeliefResult | null {
  if (!isObj(x)) return null
  return { at: isAt(x.at) ? x.at : null, ratings: pickRecord(x.ratings, isRating), facts: pickRecord(x.facts, isBool), canStop: pickCanStop(x.canStop) }
}

function parseDraft(x: unknown): Draft | null {
  if (!isObj(x)) return null
  return { ratings: pickRecord(x.ratings, isRating), facts: pickRecord(x.facts, isBool), canStop: pickCanStop(x.canStop), startedAt: isAt(x.startedAt) ? x.startedAt : null }
}

const mirror = (latest: BeliefResult | undefined) => ({ ratings: latest?.ratings ?? {}, facts: latest?.facts ?? {} })

/**
 * Saved state, checked. A wave-1 save (no `results` list) with all the ratings becomes one result with no date;
 * a partial one becomes the draft.
 */
export function parseFull(x: unknown, beliefIds: string[]): BeliefsFull {
  const o = isObj(x) ? x : {}
  if (Array.isArray(o.results)) {
    const results = o.results.map(parseResult).filter((r): r is BeliefResult => r !== null).slice(-MAX_RESULTS)
    return { ...mirror(results[results.length - 1]), draft: parseDraft(o.draft), results }
  }
  const old = parseBeliefs(x)
  if (beliefIds.length > 0 && beliefIds.every((id) => id in old.ratings)) {
    const only: BeliefResult = { at: null, ratings: old.ratings, facts: old.facts, canStop: null }
    return { ...mirror(only), draft: null, results: [only] }
  }
  const any = Object.keys(old.ratings).length + Object.keys(old.facts).length > 0
  return { ratings: {}, facts: {}, draft: any ? { ratings: old.ratings, facts: old.facts, canStop: null, startedAt: null } : null, results: [] }
}

/* ---- screens ---- */

export type Screen = { kind: "q"; i: number } | { kind: "reply"; i: number } | { kind: "fact"; i: number } | { kind: "canstop" }

/** An agreed belief (4 or 5) gets a reply screen of its own; 1 to 3 moves on. */
export const wantsReply = (rating: number | undefined): boolean => rating === 4 || rating === 5

/** Every screen of a test with these ratings: a question per belief, a reply after each 4 or 5, the facts, then the last question. */
export function screensFor(ratings: Record<string, number>, beliefs: Pick<QuitBelief, "id">[], factCount: number): Screen[] {
  const out: Screen[] = []
  beliefs.forEach((b, i) => {
    out.push({ kind: "q", i })
    if (wantsReply(ratings[b.id])) out.push({ kind: "reply", i })
  })
  for (let i = 0; i < factCount; i++) out.push({ kind: "fact", i })
  out.push({ kind: "canstop" })
  return out
}

/** The 1-based place of the first question without an answer; `list.length + 1` when all are answered. */
export function firstUnansweredScreen(d: Draft, beliefs: Pick<QuitBelief, "id">[], facts: { id: string }[]): number {
  const list = screensFor(d.ratings, beliefs, facts.length)
  const at = list.findIndex((s) =>
    s.kind === "q" ? d.ratings[beliefs[s.i].id] === undefined : s.kind === "fact" ? typeof d.facts[facts[s.i].id] !== "boolean" : s.kind === "canstop" ? d.canStop === null : false,
  )
  return at < 0 ? list.length + 1 : at + 1
}

/** "Question N of 16": replies are not counted, so a reply shows the number of the question it answers. */
export function questionNumber(list: Screen[], screen: number): number {
  const s = list[screen - 1]
  if (!s) return list.length
  if (s.kind === "q" || s.kind === "reply") return s.i + 1
  if (s.kind === "fact") return list.filter((x) => x.kind === "q").length + s.i + 1
  return list.filter((x) => x.kind !== "reply").length
}

/* ---- changes of the saved state ---- */

export const freshDraft = (now: string): Draft => ({ ratings: {}, facts: {}, canStop: null, startedAt: now })
export const hasAnswers = (d: Draft | null): boolean => d !== null && (Object.keys(d.ratings).length > 0 || Object.keys(d.facts).length > 0 || d.canStop !== null)

export function rate(s: BeliefsFull, id: string, r: number, now: string): BeliefsFull {
  const d = s.draft ?? freshDraft(now)
  return { ...s, draft: { ...d, ratings: { ...d.ratings, [id]: r } } }
}

export function answerFact(s: BeliefsFull, id: string, v: boolean, now: string): BeliefsFull {
  const d = s.draft ?? freshDraft(now)
  return { ...s, draft: { ...d, facts: { ...d.facts, [id]: v } } }
}

export function addResult(results: BeliefResult[], next: BeliefResult): BeliefResult[] {
  return [...results, next].slice(-MAX_RESULTS)
}

/** The last answer: the draft becomes the newest result and the draft is gone. */
export function finish(s: BeliefsFull, canStop: CanStop, now: string): BeliefsFull {
  const d = s.draft ?? freshDraft(now)
  const result: BeliefResult = { at: now, ratings: d.ratings, facts: d.facts, canStop }
  return { ...mirror(result), draft: null, results: addResult(s.results, result) }
}

export const startRetake = (s: BeliefsFull, now: string): BeliefsFull => ({ ...s, draft: freshDraft(now) })
export const dropDraft = (s: BeliefsFull): BeliefsFull => ({ ...s, draft: null })

/** Takes one result out; the saved `ratings` and `facts` follow the newest one that is left. */
export function deleteResult(s: BeliefsFull, index: number): BeliefsFull {
  const results = s.results.filter((_, i) => i !== index)
  return { ...s, ...mirror(results[results.length - 1]), results }
}

/* ---- the result page ---- */

export type TopKind = "held" | "soft" | "none"

/**
 * What "These hold you most" lists, by one rule for the list and the count: the beliefs rated 4 or 5, highest first,
 * ties in data order, three at most. With none of those, the top three of the 3s; with none of those, nothing.
 */
export function resultTop<B extends Pick<QuitBelief, "id">>(ratings: Record<string, number>, beliefs: B[]): { kind: TopKind; list: B[] } {
  const rated = beliefs.map((b, order) => ({ b, order, r: ratings[b.id] })).filter((x) => isRating(x.r))
  const pick = (min: number, max: number) =>
    rated
      .filter((x) => x.r >= min && x.r <= max)
      .sort((a, b) => b.r - a.r || a.order - b.order)
      .slice(0, 3)
      .map((x) => x.b)
  const held = pick(4, 5)
  if (held.length > 0) return { kind: "held", list: held }
  const soft = pick(3, 3)
  return soft.length > 0 ? { kind: "soft", list: soft } : { kind: "none", list: [] }
}

export interface Change {
  id: string
  from: number
  to: number
  dir: "more" | "less"
}

/** The beliefs whose rating differs from the earlier result, in data order. */
export function changesSince(prev: Record<string, number>, cur: Record<string, number>, beliefs: Pick<QuitBelief, "id">[]): Change[] {
  const out: Change[] = []
  for (const b of beliefs) {
    const from = prev[b.id]
    const to = cur[b.id]
    if (isRating(from) && isRating(to) && from !== to) out.push({ id: b.id, from, to, dir: to > from ? "more" : "less" })
  }
  return out
}

export interface BandAction {
  href: string
  kind: "free" | "set" | "see" | "go"
}

/** The way on from the verdict card: only to a tool that is finished; for the date tool the wording follows the shared record. */
export function bandAction(band: { id: string; link?: string | null }, finished: readonly string[], quitDate: string | null): BandAction | null {
  const m = band.link ? /^\/quit\/[a-z]+\/([a-z]+)$/.exec(band.link) : null
  if (!band.link || !m || !finished.includes(m[1])) return null
  if (m[1] !== "date") return { href: band.link, kind: "go" }
  return { href: band.link, kind: quitDate ? "see" : band.id === "free" ? "free" : "set" }
}

/** The menu's `lies` name inside a sentence: "The 12 lies nicotine tells you" becomes "the 12 lies nicotine tells you". */
export const liesInSentence = (lies: string): string => lies.replace(/^The /, "the ")

export const toolFinished = (finished: readonly string[], tool: string): boolean => finished.includes(tool)

export const takenAt = (at: string | null, locale = "en-US"): string | null =>
  at === null
    ? null
    : new Date(at).toLocaleString(locale, { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })

