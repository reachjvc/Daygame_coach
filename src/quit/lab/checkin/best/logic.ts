import { addDays, monthOf } from "../shared/logic"

/** One day of the improved check-in. Every part is optional; `slipped` is set once the evening answer is given. */
export interface BestDay {
  pledge?: string
  /** Expected difficulty, 1 easy to 5 very hard. */
  forecast?: number
  slipped?: boolean
  /** How hard it was, same 1 to 5 scale as the forecast. */
  hard?: number
  /** Strength of urges, 1 to 5. */
  urges?: number
  feelings?: string[]
  note?: string
}

export type BestDays = Record<string, BestDay>

/** Pattern lines start from this many check-ins with a result. */
export const MIN_CHECKINS = 14
/** A comparison needs at least this many days on each side before it is shown. */
export const MIN_SIDE = 3
/** A feeling is compared only when he marked it on at least this many days. */
export const MIN_FEELING_DAYS = 3
/** Forecast, hard or urge values from here up count as "hard". */
export const HARD_FROM = 4

/** Feeling words that are good ones; every other key of the data file is a hard one. */
export const GOOD_KEYS = ["better-mood", "better-sleep", "clear-head", "body-health", "energy", "confidence", "proud", "libido-back", "money", "relationships"] as const

/** Short neutral set used when the data file has no feeling words. */
export const FALLBACK_FEELINGS: Record<string, string> = {
  stressed: "Stressed",
  bored: "Bored",
  tired: "Tired",
  restless: "Restless",
  calm: "Calm",
  proud: "Proud",
}
export const FALLBACK_GOOD = ["calm", "proud"]

export const hasOutcome = (d: BestDay | undefined): d is BestDay & { slipped: boolean } => typeof d?.slipped === "boolean"

const hasAnyMoment = (d: BestDay | undefined): boolean =>
  !!d && (!!d.pledge?.trim() || d.forecast !== undefined || d.slipped !== undefined || d.hard !== undefined || d.urges !== undefined || (d.feelings?.length ?? 0) > 0 || !!d.note?.trim())

/** Days of one month with anything saved, and how many of them were clear. Nothing resets: another month is another count. */
export function monthCounts(days: BestDays, ym: string): { checkedIn: number; clear: number } {
  const keys = Object.keys(days).filter((k) => monthOf(k) === ym)
  return { checkedIn: keys.filter((k) => hasAnyMoment(days[k])).length, clear: keys.filter((k) => days[k].slipped === false).length }
}

export interface Pairing {
  forecast: number
  hard: number
  /** Result minus forecast: above 0 means harder than expected. */
  diff: number
}

/** Forecast and result of one day side by side, or null while one is missing. */
export function pairing(d: BestDay | undefined): Pairing | null {
  if (!d || d.forecast === undefined || d.hard === undefined) return null
  return { forecast: d.forecast, hard: d.hard, diff: d.hard - d.forecast }
}

/** Over all days with both: how many were harder than expected, easier, and the same. */
export function pairingCounts(days: BestDays): { n: number; harder: number; easier: number; same: number } {
  const all = Object.values(days)
    .map(pairing)
    .filter((p): p is Pairing => p !== null)
  return { n: all.length, harder: all.filter((p) => p.diff > 0).length, easier: all.filter((p) => p.diff < 0).length, same: all.filter((p) => p.diff === 0).length }
}

/** Yesterday's key when it has no evening answer yet, else null. */
export function lookBack(days: BestDays, today: string): string | null {
  const y = addDays(today, -1)
  return hasOutcome(days[y]) ? null : y
}

export type PatternKind = "forecast" | "urges" | "feeling"

export interface PatternLine {
  kind: PatternKind
  /** Feeling key, for kind "feeling". */
  key?: string
  withDays: number
  withSlips: number
  otherDays: number
  otherSlips: number
}

export interface Patterns {
  /** Days with a result. */
  count: number
  ready: boolean
  lines: PatternLine[]
  pairs: ReturnType<typeof pairingCounts>
}

type Row = BestDay & { slipped: boolean }

function compare(kind: PatternKind, rows: Row[], inGroup: (d: Row) => boolean, key?: string): PatternLine | null {
  const withRows = rows.filter(inGroup)
  const other = rows.filter((d) => !inGroup(d))
  if (withRows.length < MIN_SIDE || other.length < MIN_SIDE) return null
  const withSlips = withRows.filter((d) => d.slipped).length
  const otherSlips = other.filter((d) => d.slipped).length
  // equal shares of slips on both sides: no pattern, no line
  if (withSlips * other.length === otherSlips * withRows.length) return null
  return { kind, key, withDays: withRows.length, withSlips, otherDays: other.length, otherSlips }
}

const gapOf = (l: PatternLine) => Math.abs(l.withSlips / l.withDays - l.otherSlips / l.otherDays)

/**
 * Pattern lines from his own days only: expected-hard days, strong-urge days and the feelings he marked.
 * Every line carries both day counts. Nothing is shown before MIN_CHECKINS days with a result.
 */
export function patternsOf(days: BestDays): Patterns {
  const rows = Object.values(days).filter(hasOutcome)
  const pairs = pairingCounts(days)
  if (rows.length < MIN_CHECKINS) return { count: rows.length, ready: false, lines: [], pairs }
  const lines: PatternLine[] = []
  const forecast = compare(
    "forecast",
    rows.filter((d) => d.forecast !== undefined),
    (d) => (d.forecast ?? 0) >= HARD_FROM,
  )
  if (forecast) lines.push(forecast)
  const urges = compare(
    "urges",
    rows.filter((d) => d.urges !== undefined),
    (d) => (d.urges ?? 0) >= HARD_FROM,
  )
  if (urges) lines.push(urges)
  const counts = new Map<string, number>()
  for (const d of rows) for (const f of new Set(d.feelings ?? [])) counts.set(f, (counts.get(f) ?? 0) + 1)
  const feelings = [...counts.entries()]
    .filter(([, n]) => n >= MIN_FEELING_DAYS)
    .map(([key]) => compare("feeling", rows, (d) => (d.feelings ?? []).includes(key), key))
    .filter((l): l is PatternLine => l !== null)
    .sort((a, b) => gapOf(b) - gapOf(a) || b.withDays - a.withDays || (a.key ?? "").localeCompare(b.key ?? ""))
  lines.push(...feelings.slice(0, 2))
  return { count: rows.length, ready: true, lines, pairs }
}

/** Feeling keys split into hard ones and good ones, in data-file order. */
export function splitFeelings(words: Record<string, string> | undefined): { hard: [string, string][]; good: [string, string][] } {
  const usable = !!words && Object.keys(words).length > 0
  const entries = Object.entries(usable ? words : FALLBACK_FEELINGS)
  const goodKeys: readonly string[] = usable ? GOOD_KEYS : FALLBACK_GOOD
  return { hard: entries.filter(([k]) => !goodKeys.includes(k)), good: entries.filter(([k]) => goodKeys.includes(k)) }
}

export type Mode = "clear" | "hard" | "feelings" | "notes"

/** What a calendar cell shows in a mode: "none" when the day has nothing for that mode, else a level 1 to 5 (clear and notes use 1). */
export function cellLevel(d: BestDay | undefined, mode: Mode): { state: "none" | "clear" | "slip" | "set"; level: number } {
  if (!d) return { state: "none", level: 0 }
  if (mode === "clear") return d.slipped === undefined ? { state: "none", level: 0 } : { state: d.slipped ? "slip" : "clear", level: 1 }
  if (mode === "hard") return d.hard === undefined ? { state: "none", level: 0 } : { state: "set", level: d.hard }
  if (mode === "feelings") {
    const n = d.feelings?.length ?? 0
    return n === 0 ? { state: "none", level: 0 } : { state: "set", level: Math.min(5, n) }
  }
  return d.note?.trim() ? { state: "set", level: 1 } : { state: "none", level: 0 }
}

export const DEFAULT_REMINDERS = { morning: "08:00", evening: "21:00" }
export type Reminders = typeof DEFAULT_REMINDERS

/**
 * Example data: 20 labelled days ending two days ago, so yesterday is open for "fill in yesterday".
 * Rows are [forecast, slipped, hard, urges, feelings, note].
 */
const SEED: [number, boolean, number, number, string[], string?][] = [
  [4, true, 5, 5, ["bored", "restless"], "Long evening alone, gave in around ten."],
  [2, false, 1, 1, ["energy"]],
  [3, false, 2, 2, ["tired"]],
  [5, false, 4, 4, ["anxious", "bored"], "Hard morning, got through it by walking."],
  [2, false, 2, 1, ["better-mood"]],
  [1, false, 1, 1, ["proud"]],
  [4, true, 4, 4, ["bored", "irritable"]],
  [3, false, 3, 2, ["tired"]],
  [2, false, 2, 2, ["clear-head"]],
  [4, false, 3, 3, ["anxious"]],
  [2, false, 1, 1, ["better-sleep"]],
  [3, true, 4, 4, ["bored"], "Slipped after a bad call."],
  [2, false, 2, 1, ["energy", "proud"]],
  [4, false, 4, 4, ["restless"]],
  [1, false, 1, 1, ["better-mood"]],
  [3, false, 2, 2, ["tired"]],
  [5, true, 5, 5, ["irritable", "anxious"], "Everything went wrong at work."],
  [2, false, 2, 2, ["clear-head"]],
  [3, false, 3, 3, ["restless"]],
  [2, false, 1, 1, ["proud"]],
]

export function seedBest(today: string): BestDays {
  const out: BestDays = {}
  SEED.forEach(([forecast, slipped, hard, urges, feelings, note], i) => {
    out[addDays(today, -(i + 2))] = { pledge: "Today I stay clear.", forecast, slipped, hard, urges, feelings, note }
  })
  return out
}
