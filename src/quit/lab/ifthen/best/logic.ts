import { parseScale } from "../c/logic"

export { parseScale }

/** One plan line: a situation and the one thing he will do there. Stored at `ifthen/best/pairs`. */
export interface Pair {
  id: string
  addiction: string
  /** The situation as a list label or as he typed it. */
  situation: string
  /** True when he typed the situation. */
  custom: boolean
  /** What he will do, as a verb phrase ("walk for five minutes"). */
  then: string
  /** True when he typed the "then"; false when it came from the data file's list. */
  own: boolean
  /** The data file's id for a list "then", else null. */
  swapId: string | null
  /** True for the example plan (cleared by one tap). */
  example?: boolean
}

export interface Settings {
  importance: string
  confidence: string
  /** YYYY-MM-DD, "" when not set. */
  checkin: string
  /** Per pair id, his answer on the check-in date. */
  reviews: Record<string, "kept" | "change">
  /** "Show these on my SOS screen". */
  sos: boolean
}

export const EMPTY_SETTINGS: Settings = { importance: "", confidence: "", checkin: "", reviews: {}, sos: false }

const lowerFirst = (s: string): string => (/^I(\b|['’])/.test(s) || !/^[A-Z][a-z]/.test(s) ? s : s[0].toLowerCase() + s.slice(1))
const trimEnd = (s: string): string => s.trim().replace(/[\s.,;:!?]+$/, "")

/** "If ..." part: list labels are reworded ("After a meal" gives "If it is after a meal"); typed ones are kept. */
export function ifPart(situation: string, custom: boolean): string {
  const s = trimEnd(situation)
  if (!s) return ""
  const lead = s.match(/^(when|if)\s+/i)
  if (lead) return `If ${lowerFirst(s.slice(lead[0].length))}`
  return custom ? `If ${s}` : `If it is ${lowerFirst(s)}`
}

/** What follows "then I": typed "I will walk" or "then I walk" are cleaned to "walk". */
export function thenPart(then: string): string {
  let s = trimEnd(then)
  s = s.replace(/^then\s+/i, "").replace(/^I\s+(will\s+|'ll\s+|’ll\s+)?/i, "")
  return lowerFirst(s)
}

/** The live sentence; an empty "then" shows an ellipsis so he sees what is missing. */
export function buildSentence(situation: string, custom: boolean, then: string): string {
  const a = ifPart(situation, custom)
  if (!a) return ""
  const b = thenPart(then)
  return `${a}, then I ${b || "…"}.`
}

/** Typed negations the nudge looks for: won't, will not, not, don't, do not, stop, never. */
const NEGATION = /(^|[^\p{L}])(won['’]?t|will\s+not|do\s+not|don['’]?t|not|never|stop)(?![\p{L}])/iu
export const hasNegation = (text: string): boolean => NEGATION.test(text)

export const newPairId = (): string => `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`

export function parsePairs(raw: unknown): Pair[] {
  if (!Array.isArray(raw)) return []
  const out: Pair[] = []
  for (const x of raw) {
    if (!x || typeof x !== "object") continue
    const p = x as Record<string, unknown>
    if (typeof p.id !== "string" || typeof p.addiction !== "string" || typeof p.situation !== "string" || typeof p.then !== "string") continue
    out.push({
      id: p.id,
      addiction: p.addiction,
      situation: p.situation,
      custom: p.custom === true,
      then: p.then,
      own: p.own === true,
      swapId: typeof p.swapId === "string" ? p.swapId : null,
      ...(p.example === true ? { example: true } : {}),
    })
  }
  return out
}

export function parseSettings(raw: unknown): Settings {
  if (!raw || typeof raw !== "object") return EMPTY_SETTINGS
  const s = raw as Record<string, unknown>
  const reviews: Settings["reviews"] = {}
  if (s.reviews && typeof s.reviews === "object") {
    for (const [k, v] of Object.entries(s.reviews as Record<string, unknown>)) if (v === "kept" || v === "change") reviews[k] = v
  }
  return {
    importance: typeof s.importance === "string" ? parseScale(s.importance, "") : "",
    confidence: typeof s.confidence === "string" ? parseScale(s.confidence, "") : "",
    checkin: typeof s.checkin === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s.checkin) ? s.checkin : "",
    reviews,
    sos: s.sos === true,
  }
}

/** Pairs of one addiction, in stored order. */
export const pairsFor = (pairs: Pair[], addiction: string): Pair[] => pairs.filter((p) => p.addiction === addiction)

const keyOf = (s: string) => s.trim().toLowerCase()
export const sameSituation = (a: string, b: string): boolean => keyOf(a) === keyOf(b)

/** Add or replace the pair for one situation of one addiction; the plan order is kept. */
export function upsertPair(pairs: Pair[], next: Pair): Pair[] {
  const at = pairs.findIndex((p) => p.addiction === next.addiction && sameSituation(p.situation, next.situation))
  if (at < 0) return [...pairs, next]
  return pairs.map((p, i) => (i === at ? { ...next, id: p.id } : p))
}

/** Move one pair of an addiction up or down among that addiction's pairs; other addictions stay put. */
export function movePair(pairs: Pair[], id: string, dir: -1 | 1): Pair[] {
  const mine = pairs.filter((p) => p.addiction === pairs.find((q) => q.id === id)?.addiction)
  const i = mine.findIndex((p) => p.id === id)
  const j = i + dir
  if (i < 0 || j < 0 || j >= mine.length) return pairs
  const swapped = [...mine]
  ;[swapped[i], swapped[j]] = [swapped[j], swapped[i]]
  let k = 0
  return pairs.map((p) => (mine.includes(p) ? swapped[k++] : p))
}

/** True on or after the check-in date. `today` and `checkin` are YYYY-MM-DD; either empty means not due. */
export const isDue = (checkin: string, today: string): boolean => checkin !== "" && today !== "" && checkin <= today

/** How many cards he has answered "kept" and "change" on the check-in date. */
export function reviewCounts(pairs: Pair[], reviews: Settings["reviews"]): { kept: number; change: number; open: number } {
  let kept = 0
  let change = 0
  for (const p of pairs) {
    if (reviews[p.id] === "kept") kept++
    else if (reviews[p.id] === "change") change++
  }
  return { kept, change, open: pairs.length - kept - change }
}

/** A situation he may tick: a list entry or his own words. */
export interface Situation {
  label: string
  custom: boolean
}

/**
 * His top two endings from the past-tries tool, as situations. Accepts strings or `{id,label|text}`;
 * an entry matching a list moment (by id or words) becomes that moment, else his own situation. Anything else gives [].
 */
export function handoffSituations(raw: unknown, moments: { id: string; label: string }[]): Situation[] {
  if (!Array.isArray(raw)) return []
  const out: Situation[] = []
  for (const x of raw) {
    let id = ""
    let label = ""
    if (typeof x === "string") {
      id = x
      label = x
    } else if (x && typeof x === "object") {
      const o = x as Record<string, unknown>
      id = typeof o.id === "string" ? o.id : ""
      label = typeof o.label === "string" ? o.label : typeof o.text === "string" ? o.text : ""
    }
    if (!id && !label.trim()) continue
    const m = moments.find((q) => (id && q.id === id) || (label && sameSituation(q.label, label)))
    const sit: Situation = m ? { label: m.label, custom: false } : { label: label.trim() || id, custom: true }
    if (!out.some((s) => sameSituation(s.label, sit.label))) out.push(sit)
    if (out.length === 2) break
  }
  return out
}

/** Toggle one situation in a list. */
export function toggleSituation(list: Situation[], sit: Situation): Situation[] {
  return list.some((s) => sameSituation(s.label, sit.label)) ? list.filter((s) => !sameSituation(s.label, sit.label)) : [...list, sit]
}

/** Who studies back a line, and what each addiction sees. porn: hidden; the studied group's own addiction: plain; others: tagged. */
export type StudiedIn = "smokers" | "drinkers" | "eating"
export type EvidenceMode = "plain" | "tagged" | "hidden"
export function evidenceMode(studiedIn: StudiedIn, addiction: string): EvidenceMode {
  if (studiedIn === "eating") return "tagged"
  if (addiction === "porn") return "hidden"
  if ((studiedIn === "smokers" && addiction === "nicotine") || (studiedIn === "drinkers" && addiction === "alcohol")) return "plain"
  return "tagged"
}
