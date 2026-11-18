import { dayKey, keyMs, lastDays, mean, rnd } from "../shared/logic"

/** One diary entry. `situation` is an id of the addiction's `riskyMoments`; `moves` are ids of the help deck. */
export interface DiaryEntry {
  id: string
  at: number
  strength: number
  situation: string | null
  feelings: string[]
  moves: string[]
  /** Answer to "did you smoke / use?"; null while unanswered. */
  used: boolean | null
}

/** Patterns need this many entries; below it only a line saying so shows. */
export const MIN_ENTRIES = 5
/** Shares in percent show from this many entries; below it counts only. */
export const PERCENT_FROM = 10

export type PatternMode = "none" | "counts" | "percent"

export function patternMode(n: number): PatternMode {
  return n < MIN_ENTRIES ? "none" : n < PERCENT_FROM ? "counts" : "percent"
}

export interface Bucket {
  id: "morning" | "afternoon" | "evening" | "night"
  /** First hour of the bucket, 0 to 23. */
  from: number
  /** Last hour of the bucket (inclusive). */
  to: number
}

/** The four parts of the day; night runs over midnight. */
export const TIME_BUCKETS: readonly Bucket[] = [
  { id: "morning", from: 5, to: 11 },
  { id: "afternoon", from: 12, to: 16 },
  { id: "evening", from: 17, to: 21 },
  { id: "night", from: 22, to: 4 },
]

export function bucketOf(hour: number): Bucket["id"] {
  const h = ((Math.floor(hour) % 24) + 24) % 24
  for (const b of TIME_BUCKETS) {
    if (b.from <= b.to ? h >= b.from && h <= b.to : h >= b.from || h <= b.to) return b.id
  }
  return "night"
}

/** "05:00–11:59" for a bucket. */
export function bucketRange(b: Bucket): string {
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${pad(b.from)}:00–${pad(b.to)}:59`
}

export interface Row {
  key: string
  label: string
  count: number
  /** Whole percent of the entries counted, or null below 10 entries. */
  percent: number | null
}

function rows(items: { key: string; label: string; count: number }[], total: number, keepEmpty: boolean, sort: boolean): Row[] {
  const percent = (c: number) => (total >= PERCENT_FROM && total > 0 ? Math.round((c / total) * 100) : null)
  const out = items.filter((r) => keepEmpty || r.count > 0).map((r) => ({ ...r, percent: percent(r.count) }))
  return sort ? out.map((r, i) => ({ r, i })).sort((a, b) => b.r.count - a.r.count || a.i - b.i).map(({ r }) => r) : out
}

/** Entries per situation, most often first. `total` is the number of entries that name a situation. */
export function bySituation(entries: DiaryEntry[], moments: { id: string; label: string }[]): { rows: Row[]; total: number } {
  const items = moments.map((m) => ({ key: m.id, label: m.label, count: entries.filter((e) => e.situation === m.id).length }))
  const total = items.reduce((a, r) => a + r.count, 0)
  return { rows: rows(items, total, false, true), total }
}

/** Entries per part of the day, in clock order, empty parts kept. */
export function byTime(entries: DiaryEntry[], labels: Record<Bucket["id"], string>): Row[] {
  const items = TIME_BUCKETS.map((b) => ({
    key: b.id,
    label: labels[b.id],
    count: entries.filter((e) => bucketOf(new Date(e.at).getHours()) === b.id).length,
  }))
  return rows(items, entries.length, true, false)
}

/** Entries per weekday, Monday first, empty days kept. `names` is Sunday-first. */
export function byWeekday(entries: DiaryEntry[], names: readonly string[]): Row[] {
  const order = [1, 2, 3, 4, 5, 6, 0]
  const items = order.map((d) => ({ key: String(d), label: names[d], count: entries.filter((e) => new Date(e.at).getDay() === d).length }))
  return rows(items, entries.length, true, false)
}

export interface MoveRow {
  id: string
  text: string
  /** Entries that list this move. */
  used: number
  /** Of those, entries where he answered that he did not smoke / use. */
  through: number
}

/** Per move: how many entries list it and how many of those he got through. Moves never logged are left out. */
export function byMove(entries: DiaryEntry[], deck: { id: string; text: string }[]): MoveRow[] {
  const out = deck
    .map((c) => {
      const mine = entries.filter((e) => e.moves.includes(c.id))
      return { id: c.id, text: c.text, used: mine.length, through: mine.filter((e) => e.used === false).length }
    })
    .filter((r) => r.used > 0)
  return out.map((r, i) => ({ r, i })).sort((a, b) => b.r.used - a.r.used || a.i - b.i).map(({ r }) => r)
}

export interface DayGroup {
  date: string
  count: number
  /** Mean strength of the day, or null with no entries. */
  mean: number | null
  slips: number
  entries: DiaryEntry[]
}

/** Entries by local day, newest day first, each day's entries newest first. */
export function dayGroups(entries: DiaryEntry[]): DayGroup[] {
  const map = new Map<string, DiaryEntry[]>()
  for (const e of [...entries].sort((a, b) => b.at - a.at)) {
    const k = dayKey(e.at)
    map.set(k, [...(map.get(k) ?? []), e])
  }
  return [...map.entries()].map(([date, list]) => ({
    date,
    count: list.length,
    mean: mean(list.map((e) => e.strength)),
    slips: list.filter((e) => e.used === true).length,
    entries: list,
  }))
}

/** Time in ms from a `YYYY-MM-DD` day and an `HH:MM` time, in this browser's time zone; null when either is invalid. */
export function atFromParts(date: string, time: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return null
  const [h, m] = time.split(":").map(Number)
  if (h > 23 || m > 59) return null
  const d = new Date(keyMs(date))
  d.setHours(h, m, 0, 0)
  return Number.isFinite(d.getTime()) ? d.getTime() : null
}

export const timeOf = (ms: number): string => `${String(new Date(ms).getHours()).padStart(2, "0")}:${String(new Date(ms).getMinutes()).padStart(2, "0")}`

/** Replaces the entry with the same id, or adds it. */
export function upsert(entries: DiaryEntry[], entry: DiaryEntry): DiaryEntry[] {
  return entries.some((e) => e.id === entry.id) ? entries.map((e) => (e.id === entry.id ? entry : e)) : [...entries, entry]
}

export function remove(entries: DiaryEntry[], id: string): DiaryEntry[] {
  return entries.filter((e) => e.id !== id)
}

/** Strength 1 to 10 only. */
export const validStrength = (n: unknown): n is number => typeof n === "number" && Number.isInteger(n) && n >= 1 && n <= 10

/** Saved entries, checked. */
export function parseEntries(x: unknown): DiaryEntry[] {
  if (!Array.isArray(x)) return []
  const out: DiaryEntry[] = []
  for (const r of x) {
    if (typeof r !== "object" || r === null) continue
    const o = r as Record<string, unknown>
    if (typeof o.id !== "string" || typeof o.at !== "number" || !Number.isFinite(o.at) || !validStrength(o.strength)) continue
    const strs = (v: unknown) => (Array.isArray(v) ? v.filter((s): s is string => typeof s === "string") : [])
    out.push({
      id: o.id,
      at: o.at,
      strength: o.strength,
      situation: typeof o.situation === "string" ? o.situation : null,
      feelings: strs(o.feelings),
      moves: strs(o.moves),
      used: typeof o.used === "boolean" ? o.used : null,
    })
  }
  return out
}

export interface SeedPieces {
  moments: { id: string }[]
  moves: { id: string }[]
  feelings: string[]
}

/** 20 labelled example entries over the 21 days before `now`: deterministic, a few slips, some with moves. */
export function seedEntries(now: number, p: SeedPieces): DiaryEntry[] {
  const days = lastDays(now - 86_400_000, 21)
  const hours = [7, 9, 13, 15, 18, 20, 22, 23, 1, 10, 12, 19]
  const pick = <T,>(list: T[], seed: number): T | null => (list.length ? list[Math.floor(rnd(seed) * list.length)] : null)
  return Array.from({ length: 20 }, (_, i) => {
    const date = days[Math.min(20, Math.floor(i * 1.05))]
    const hour = hours[Math.floor(rnd(i + 3) * hours.length)]
    const used = i % 7 === 4 ? true : i % 5 === 0 ? null : false
    const at = atFromParts(date, `${String(hour).padStart(2, "0")}:${String(Math.floor(rnd(i + 9) * 4) * 15).padStart(2, "0")}`) ?? now
    const m = pick(p.moves, i + 41)
    const f = pick(p.feelings, i + 51)
    return {
      id: `ex-${i}`,
      at,
      strength: 2 + Math.floor(rnd(i + 11) * 8),
      situation: pick(p.moments, i * 3 + 7)?.id ?? null,
      feelings: f ? [f] : [],
      moves: m && i % 3 !== 0 ? [m.id] : [],
      used,
    }
  })
}
