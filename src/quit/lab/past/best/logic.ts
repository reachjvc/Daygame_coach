export type LenUnit = "days" | "weeks" | "months"
export const LEN_UNITS: readonly LenUnit[] = ["days", "weeks", "months"]
/** Rough units, stated on screen: a week counts 7 days, a month 30. */
export const DAYS_PER: Record<LenUnit, number> = { days: 1, weeks: 7, months: 30 }

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

/** A try needs at least one field filled to be saved. */
export function hasContent(t: Try): boolean {
  return t.when !== "" || (t.len !== null && t.len > 0) || t.how.length > 0 || t.ended.length > 0 || t.endedText.trim() !== "" || t.helped.length > 0 || t.helpedText.trim() !== ""
}

/** Length in days, or null when none was given. Weeks and months are rough (7 and 30). */
export function tryDays(t: Try): number | null {
  if (t.len === null || !Number.isFinite(t.len) || t.len <= 0) return null
  return t.len * DAYS_PER[t.unit]
}

export function lengthsOf(tries: readonly Try[]): number[] {
  return tries.map(tryDays).filter((d): d is number => d !== null)
}

/** True when any length was typed in weeks or months, so the rough conversion is stated. */
export function usesRoughUnits(tries: readonly Try[]): boolean {
  return tries.some((t) => tryDays(t) !== null && t.unit !== "days")
}

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

/**
 * The days most tries ended in: the narrowest run of sorted lengths holding more than half of them.
 * Needs two tries with lengths. The earlier window wins a tie.
 */
export function dangerWindow(tries: readonly Try[]): { from: number; to: number; count: number; of: number } | null {
  const l = lengthsOf(tries).sort((a, b) => a - b)
  if (l.length < 2) return null
  const k = Math.floor(l.length / 2) + 1
  let best = 0
  for (let i = 1; i + k <= l.length; i++) if (l[i + k - 1] - l[i] < l[best + k - 1] - l[best]) best = i
  const from = Math.floor(l[best])
  const to = Math.ceil(l[best + k - 1])
  return { from, to, count: l.filter((d) => d >= from && d <= to).length, of: l.length }
}

export interface Bar {
  id: string
  days: number
}

/** Bars in the order the tries are kept, only tries with a length. */
export function bars(tries: readonly Try[]): Bar[] {
  const out: Bar[] = []
  for (const t of tries) {
    const d = tryDays(t)
    if (d !== null) out.push({ id: t.id, days: d })
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

/** "21 days", "1 day"; whole numbers when whole, one decimal otherwise. */
export function daysText(d: number): string {
  const r = Number.isInteger(d) ? d : Math.round(d * 10) / 10
  return `${r} ${r === 1 ? "day" : "days"}`
}

export interface Handoff {
  endings: Option[]
  window: { from: number; to: number } | null
  helped: Option[]
}

const bare = (key: string) => key.replace(/^(id|t):/, "")

/** What the other tools may read: top two endings, the danger window, the helped list most-named first. */
export function handoffOf(tries: readonly Try[], endings: readonly Option[], helped: readonly Option[]): Handoff {
  const e = endingCounts(tries, endings).items.slice(0, 2).map((c) => ({ id: bare(c.key), label: c.label }))
  const h = helpedCounts(tries, helped).items.map((c) => ({ id: bare(c.key), label: c.label }))
  const w = dangerWindow(tries)
  return { endings: e, window: w ? { from: w.from, to: w.to } : null, helped: h }
}

/** Example tries, labelled as an example on screen. Ending and helped ids exist only where the data file has them. */
export function exampleTries(withChips: boolean): Try[] {
  const base = (id: string, when: string, len: number, unit: LenUnit, how: string[], ended: string[], helped: string[]): Try => ({
    ...emptyTry(id),
    when,
    len,
    unit,
    how,
    ended: withChips ? ended : [],
    helped: withChips ? helped : [],
  })
  return [
    base("ex-1", "2025-02", 3, "days", ["all-at-once"], ["stress"], ["busy"]),
    base("ex-2", "2025-06", 9, "days", ["all-at-once", "with-an-app"], ["offered"], ["told", "busy"]),
    base("ex-3", "2025-09", 2, "weeks", ["with-a-person"], ["stress"], ["told"]),
    base("ex-4", "2026-03", 6, "days", ["all-at-once"], ["empty-evening"], ["moved"]),
  ]
}
