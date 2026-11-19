import { getAddiction } from "../../data"
import type { QuitEnding } from "../../types"
import { isObj, pickInt, pickOne, pickStr, pickStrings, usable } from "../common"
import { parseTyped } from "../date/logic"

export const LEN_UNITS = ["days", "weeks", "months", "years"] as const
export type LenUnit = (typeof LEN_UNITS)[number]
/** Rough units, stated on screen: a week counts 7 days, a month 30, a year 365. */
export const DAYS_PER: Record<LenUnit, number> = { days: 1, weeks: 7, months: 30, years: 365 }

export const COUNTS = ["never", "1", "2-3", "4-9", "10+"] as const
export type Count = (typeof COUNTS)[number]
export const AFTER_SLIP = ["gaveUp", "restarted", "justOnce", "dontRemember"] as const
export type AfterSlip = (typeof AFTER_SLIP)[number]

export const MAX_TRIES = 200
export const MAX_LEN = 999
export const MAX_FREE = 60
export const FIRST_MONTH = "1960-01"

export interface Try {
  id: string
  /** "YYYY-MM" or "". */
  when: string
  len: number | null
  unit: LenUnit
  how: string[]
  /** Ending chip ids from the data file. */
  ended: string[]
  endedText: string
  helped: string[]
  helpedText: string
}

export interface PastState {
  v: 2
  count: Count | null
  tries: Try[]
  afterSlip: AfterSlip | null
}

export const EMPTY_PAST: PastState = { v: 2, count: null, tries: [], afterSlip: null }

export interface Option {
  id: string
  label: string
}

export interface Counted {
  key: string
  label: string
  count: number
}

export function emptyTry(id: string): Try {
  return { id, when: "", len: null, unit: "days", how: [], ended: [], endedText: "", helped: [], helpedText: "" }
}

/* ---------- saved shape ---------- */

const isMonth = (x: unknown): x is string => typeof x === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(x)

function parseTry(x: unknown): Try | null {
  if (!isObj(x)) return null
  const id = pickStr(x.id, "")
  if (id === "" || id.length > 40) return null
  const len = typeof x.len === "number" && Number.isFinite(x.len) && x.len > 0 && x.len <= MAX_LEN ? x.len : null
  const ids = (v: unknown) => (pickStrings(v, []) as string[]).filter((s) => s.length <= 40).slice(0, 30)
  return {
    id,
    when: isMonth(x.when) ? x.when : "",
    len,
    unit: pickOne<LenUnit, LenUnit>(x.unit, LEN_UNITS, "days"),
    how: ids(x.how),
    ended: ids(x.ended),
    endedText: (pickStr(x.endedText, "") as string).slice(0, MAX_FREE),
    helped: ids(x.helped),
    helpedText: (pickStr(x.helpedText, "") as string).slice(0, MAX_FREE),
  }
}

/** The wave-1 shape (one longest stretch, endings and helped for all tries) read as the new one, so nothing he entered is lost. */
function fromWave1(o: Record<string, unknown>): PastState {
  const wave1Count = pickOne<string, null>(o.tries, ["0", "1", "2-3", "4-9", "10+"], null)
  const count: Count | null = wave1Count === null ? null : wave1Count === "0" ? "never" : (wave1Count as Count)
  const unit = pickOne<LenUnit, null>(o.stretchUnit, LEN_UNITS, null)
  const afterSlip = pickOne<AfterSlip, null>(o.afterSlip, AFTER_SLIP, null)
  const ended = (pickStrings(o.endings, []) as string[]).slice(0, 3)
  const helped = pickStrings(o.helped, []) as string[]
  const tries: Try[] = []
  // Anything he gave about a try becomes one try, so nothing he entered is lost.
  if (unit !== null || ended.length > 0 || helped.length > 0) {
    tries.push({ ...emptyTry("wave1"), len: unit !== null ? pickInt(o.stretchN, 1, 99, 1) : null, unit: unit ?? "days", ended, helped })
  }
  // "0 tries" next to answers about a try cannot both be true: the count is left open.
  return { v: 2, count: count === "never" && tries.length > 0 ? null : count, tries, afterSlip }
}

/** Saved state, checked. Reads the wave-1 shape too. */
export function parsePast(x: unknown): PastState {
  if (!isObj(x)) return EMPTY_PAST
  if (x.v !== 2 || !Array.isArray(x.tries)) return typeof x.tries === "string" ? fromWave1(x) : EMPTY_PAST
  const seen = new Set<string>()
  const tries: Try[] = []
  for (const raw of x.tries) {
    const t = parseTry(raw)
    if (!t || seen.has(t.id) || tries.length >= MAX_TRIES) continue
    seen.add(t.id)
    tries.push(t)
  }
  return { v: 2, count: pickOne<Count, null>(x.count, COUNTS, null), tries, afterSlip: pickOne<AfterSlip, null>(x.afterSlip, AFTER_SLIP, null) }
}

/* ---------- one try ---------- */

/** A try needs at least one field filled to be saved. */
export function hasContent(t: Try): boolean {
  return t.when !== "" || (t.len !== null && t.len > 0) || t.how.length > 0 || t.ended.length > 0 || t.endedText.trim() !== "" || t.helped.length > 0 || t.helpedText.trim() !== ""
}

/** Length in days, or null when none was given. Weeks, months and years are rough. */
export function tryDays(t: Try): number | null {
  if (t.len === null || !Number.isFinite(t.len) || t.len <= 0) return null
  return t.len * DAYS_PER[t.unit]
}

export function lengthsOf(tries: readonly Try[]): number[] {
  return tries.map(tryDays).filter((d): d is number => d !== null)
}

/** True when any length was typed in weeks, months or years, so the rough conversion is stated. */
export function usesRoughUnits(tries: readonly Try[]): boolean {
  return tries.some((t) => tryDays(t) !== null && t.unit !== "days")
}

/** "9 days", "1 day"; from 60 days "about 2 months"; from 730 days "about 2 years". */
export function lengthText(d: number): string {
  if (d >= 730) return `about ${Math.round(d / 365)} years`
  if (d >= 60) return `about ${Math.round(d / 30)} months`
  const r = Math.round(d)
  return `${r} ${r === 1 ? "day" : "days"}`
}

const UNIT_ONE: Record<LenUnit, string> = { days: "day", weeks: "week", months: "month", years: "year" }

/** A try's length as he typed it: "1.5 weeks", "1 month", "3 days". */
export function typedLength(x: Pick<Try, "len" | "unit">): string | null {
  if (x.len === null || !Number.isFinite(x.len) || x.len <= 0) return null
  // Days are whole days everywhere; weeks, months and years keep one decimal as typed.
  const n = x.unit === "days" ? Math.max(1, Math.round(x.len)) : Math.round(x.len * 10) / 10
  return `${n} ${n === 1 ? UNIT_ONE[x.unit] : x.unit}`
}

/** The short form on top of a chart bar: the day count, then "2 mo", "2 y". */
export function barText(d: number): string {
  if (d >= 730) return `${Math.round(d / 365)} y`
  if (d >= 60) return `${Math.round(d / 30)} mo`
  return String(Math.round(d))
}

export type Typed = { kind: "empty" } | { kind: "bad" } | { kind: "ok"; value: number }

/** The length field: "1,5" is 1.5; 1 to 999; blank is empty. */
export function parseLength(text: string): Typed {
  const r = parseTyped(text, MAX_LEN)
  if (r.kind === "ok" && r.value < 1) return { kind: "bad" }
  return r
}

/** "YYYY-MM" of a "YYYY-MM-DD" day. */
export const monthOf = (day: string) => day.slice(0, 7)

/** A month he may give: blank, or from January 1960 to this month. */
export function monthAllowed(when: string, today: string): boolean {
  return when === "" || (isMonth(when) && when >= FIRST_MONTH && when <= monthOf(today))
}

/** The month `n` months before the month of `today`, as "YYYY-MM". */
export function monthsBack(today: string, n: number): string {
  const y = Number(today.slice(0, 4))
  const m = Number(today.slice(5, 7)) - 1 - n
  const yy = y + Math.floor(m / 12)
  const mm = ((m % 12) + 12) % 12
  return `${yy}-${String(mm + 1).padStart(2, "0")}`
}

/* ---------- order ---------- */

/** Oldest first by month; undated last, in the order added. */
export function oldestFirst(tries: readonly Try[]): Try[] {
  const dated = tries.map((t, i) => ({ t, i })).filter((x) => x.t.when !== "")
  dated.sort((a, b) => (a.t.when < b.t.when ? -1 : a.t.when > b.t.when ? 1 : a.i - b.i))
  return [...dated.map((x) => x.t), ...tries.filter((t) => t.when === "")]
}

/** Newest first by month; undated last, in the order added. */
export function newestFirst(tries: readonly Try[]): Try[] {
  const dated = tries.map((t, i) => ({ t, i })).filter((x) => x.t.when !== "")
  dated.sort((a, b) => (a.t.when < b.t.when ? 1 : a.t.when > b.t.when ? -1 : b.i - a.i))
  return [...dated.map((x) => x.t), ...tries.filter((t) => t.when === "")]
}

/* ---------- pattern ---------- */

export function longestRun(tries: readonly Try[]): { days: number; of: number } | null {
  const l = lengthsOf(tries)
  return l.length === 0 ? null : { days: Math.max(...l), of: l.length }
}

export function averageDays(tries: readonly Try[]): number | null {
  const l = lengthsOf(tries)
  return l.length === 0 ? null : l.reduce((s, x) => s + x, 0) / l.length
}

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ")

/** Counts of what was named, chips by id and free text by its lowercase words; ties keep data-file order. */
function tally(tries: readonly Try[], pick: (t: Try) => { ids: string[]; text: string }, options: readonly Option[]): { items: Counted[]; triesNaming: number } {
  const map = new Map<string, Counted>()
  let naming = 0
  for (const t of tries) {
    const { ids, text } = pick(t)
    const keys: [string, string][] = ids.map((id) => [`id:${id}`, options.find((o) => o.id === id)?.label ?? id])
    const free = norm(text)
    if (free) keys.push([`t:${free}`, text.trim()])
    if (keys.length === 0) continue
    naming++
    for (const [key, label] of keys) {
      const c = map.get(key)
      if (c) c.count++
      else map.set(key, { key, label, count: 1 })
    }
  }
  const order = (c: Counted) => (c.key.startsWith("id:") ? options.findIndex((o) => `id:${o.id}` === c.key) : options.length)
  const items = [...map.values()].sort((a, b) => b.count - a.count || order(a) - order(b))
  return { items, triesNaming: naming }
}

export function endingCounts(tries: readonly Try[], endings: readonly Option[]) {
  return tally(tries, (t) => ({ ids: t.ended, text: t.endedText }), endings)
}

export function helpedCounts(tries: readonly Try[], helped: readonly Option[]) {
  return tally(tries, (t) => ({ ids: t.helped, text: t.helpedText }), helped)
}

/** The items tied at the top count, only when that count is 2 or more; null when nothing repeats. */
export function topRepeated(items: readonly Counted[]): { labels: string[]; count: number } | null {
  const top = items[0]?.count ?? 0
  if (top < 2) return null
  return { labels: items.filter((i) => i.count === top).map((i) => i.label), count: top }
}

/** Tries with a length needed before the days most of them ended in are shown. */
export const WINDOW_MIN = 3

/**
 * The days most tries ended in: the shortest span of sorted lengths holding more than half of them.
 * Needs three tries with lengths. The earlier span wins a tie.
 */
export function dangerWindow(tries: readonly Try[]): { from: number; to: number; count: number; of: number } | null {
  const l = lengthsOf(tries).sort((a, b) => a - b)
  if (l.length < WINDOW_MIN) return null
  const k = Math.floor(l.length / 2) + 1
  let best = 0
  for (let i = 1; i + k <= l.length; i++) if (l[i + k - 1] - l[i] < l[best + k - 1] - l[best]) best = i
  // Whole days, rounded the same way as every other length on the page.
  const from = Math.max(1, Math.round(l[best]))
  const to = Math.max(from, Math.round(l[best + k - 1]))
  return { from, to, count: l.filter((d) => Math.round(d) >= from && Math.round(d) <= to).length, of: l.length }
}

/* ---------- chart ---------- */

export interface Bar {
  id: string
  days: number
  when: string
}

/** Bars oldest to newest by month, undated last; only tries with a length. */
export function bars(tries: readonly Try[]): Bar[] {
  const out: Bar[] = []
  for (const t of oldestFirst(tries)) {
    const d = tryDays(t)
    if (d !== null) out.push({ id: t.id, days: d, when: t.when })
  }
  return out
}

/** Bar heights as shares of the longest, 0 to 1. */
export function barShares(list: readonly Bar[]): number[] {
  const max = Math.max(1, ...list.map((b) => b.days))
  return list.map((b) => b.days / max)
}

/** Where the average line sits, 0 to 1 of the tallest bar; null with no bars. */
export function avgShare(list: readonly Bar[]): number | null {
  if (list.length === 0) return null
  const max = Math.max(1, ...list.map((b) => b.days))
  return Math.min(1, list.reduce((s, b) => s + b.days, 0) / list.length / max)
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

/** "Nov 2025", or "" when no month. */
export function monthLong(when: string): string {
  return isMonth(when) ? `${MONTHS[Number(when.slice(5)) - 1]} ${when.slice(0, 4)}` : ""
}

/** "Feb 25", or "" when no month. */
export function monthShort(when: string): string {
  return isMonth(when) ? `${MONTHS[Number(when.slice(5)) - 1]} ${when.slice(2, 4)}` : ""
}

/* ---------- the count chip and the many-tries line ---------- */

const COUNT_WORDS: Record<Exclude<Count, "never">, string> = { "1": "1 try", "2-3": "2–3 tries", "4-9": "4–9 tries", "10+": "10 or more tries" }
const COUNT_MAX: Record<Exclude<Count, "never">, number> = { "1": 1, "2-3": 3, "4-9": 9, "10+": Infinity }

/** What he has behind him: the chip's words, or the listed number when he listed more tries than the chip says. */
export function triesBehind(count: Count | null, listed: number): string | null {
  const own = (n: number) => `${n} ${n === 1 ? "try" : "tries"}`
  if (count === null || count === "never") return listed > 0 ? own(listed) : null
  return listed > COUNT_MAX[count] ? own(listed) : COUNT_WORDS[count]
}

/** The after-slip and many-tries sections show once he has a count other than Never, or a try. */
export function showsMore(count: Count | null, listed: number): boolean {
  return listed > 0 || (count !== null && count !== "never")
}

/* ---------- example ---------- */

/** Four example tries dated in the 18 months before `today`; ids exist in the data file. */
export function exampleTries(today: string): Try[] {
  const mk = (id: string, back: number, len: number, unit: LenUnit, how: string[], ended: string[], helped: string[]): Try => ({ ...emptyTry(id), when: monthsBack(today, back), len, unit, how, ended, helped })
  return [
    mk("ex-1", 16, 3, "days", ["all-at-once"], ["stress"], ["busy"]),
    mk("ex-2", 12, 9, "days", ["all-at-once", "with-an-app"], ["offered"], ["told", "busy"]),
    mk("ex-3", 8, 2, "weeks", ["with-a-person"], ["stress"], ["told"]),
    mk("ex-4", 3, 6, "days", ["all-at-once"], ["empty-evening"], ["moved"]),
  ]
}

/* ---------- for the if-then tool ---------- */

/** The top two endings by count (data-file ids only, ties in data-file order), from the raw saved state. */
export function pastEndingsForPlan(raw: unknown): { id: string; label: string }[] {
  const state = parsePast(raw)
  const endings = usable<QuitEnding[]>(getAddiction("nicotine")?.endings) ?? []
  const opts = endings.map((e): Option => ({ id: e.id, label: e.label }))
  return endingCounts(state.tries, opts)
    .items.filter((c) => c.key.startsWith("id:") && opts.some((o) => `id:${o.id}` === c.key))
    .slice(0, 2)
    .map((c) => ({ id: c.key.slice(3), label: c.label }))
}
