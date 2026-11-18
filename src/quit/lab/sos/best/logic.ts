import { shares } from "../shared/clock"
import type { QuitNeed, QuitOption, QuitResponse, QuitSwap } from "../../../types"

/** The wait lengths he can choose, in minutes; the middle one is preselected. */
export const WAIT_CHOICES = [5, 10, 15] as const
export const DEFAULT_WAIT = 10

/** A second log inside this many milliseconds of the first updates it. */
export const LOG_WINDOW_MS = 5 * 60 * 1000
/** The situation list shows from this many logs on. */
export const PATTERN_MIN = 3

export interface Wait {
  minutes: number
  startedAt: number | null
}

export interface RingView {
  running: boolean
  over: boolean
  leftMs: number
  /** 1 at the start, 0 at the end. */
  fraction: number
}

/** Where the ring stands at `now`, for a wait of the chosen length. */
export function ringView(wait: Wait, now: number): RingView {
  const total = wait.minutes * 60_000
  if (wait.startedAt === null) return { running: false, over: false, leftMs: total, fraction: 1 }
  const leftMs = Math.min(total, Math.max(0, total - (now - wait.startedAt)))
  return { running: leftMs > 0, over: leftMs === 0, leftMs, fraction: leftMs / total }
}

/** mm:ss, rounded up to the second so 00:00 shows only at the very end. */
export function ringClock(ms: number): string {
  const total = Math.ceil(Math.max(0, ms) / 1000)
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`
}

/** Whole minutes that have gone by of a started wait, never more than its length. */
export function minutesWaited(wait: Wait, now: number): number {
  if (wait.startedAt === null) return 0
  return Math.floor((wait.minutes * 60_000 - ringView(wait, now).leftMs) / 60_000)
}

export function parseWait(x: unknown): Wait {
  const o = typeof x === "object" && x !== null ? (x as Record<string, unknown>) : {}
  const m = (WAIT_CHOICES as readonly number[]).includes(o.minutes as number) ? (o.minutes as number) : DEFAULT_WAIT
  const s = typeof o.startedAt === "number" && Number.isFinite(o.startedAt) && o.startedAt > 0 ? o.startedAt : null
  return { minutes: m, startedAt: s }
}

export interface LogEntry {
  at: number
  strength: number | null
  /** An id of the addiction's `riskyMoments`; null when none was picked. */
  situation: string | null
}

/** Adds a log, or updates the last one when it is less than five minutes old. */
export function addLog(logs: LogEntry[], entry: LogEntry, now: number): { logs: LogEntry[]; updated: boolean } {
  const last = logs[logs.length - 1]
  if (last && now >= last.at && now - last.at < LOG_WINDOW_MS) {
    return { logs: [...logs.slice(0, -1), { ...entry, at: last.at }], updated: true }
  }
  return { logs: [...logs, { ...entry, at: now }], updated: false }
}

export function parseLogs(x: unknown): LogEntry[] {
  if (!Array.isArray(x)) return []
  const out: LogEntry[] = []
  for (const r of x) {
    if (typeof r !== "object" || r === null) continue
    const o = r as Record<string, unknown>
    if (typeof o.at !== "number" || !Number.isFinite(o.at)) continue
    const strength = typeof o.strength === "number" && Number.isInteger(o.strength) && o.strength >= 1 && o.strength <= 10 ? o.strength : null
    out.push({ at: o.at, strength, situation: typeof o.situation === "string" ? o.situation : null })
  }
  return out
}

export interface Bar {
  id: string
  label: string
  count: number
  percent: number
}

export interface Pattern {
  /** Logs that name a situation. */
  total: number
  ready: boolean
  bars: Bar[]
}

/** His logged situations as bars, most often first; `ready` from three logs on. */
export function situationBars(logs: LogEntry[], moments: Pick<QuitOption, "id" | "label">[]): Pattern {
  const counts = moments.map((m) => logs.filter((l) => l.situation === m.id).length)
  const total = counts.reduce((a, b) => a + b, 0)
  const pct = shares(counts)
  const bars = moments
    .map((m, i) => ({ id: m.id, label: m.label, count: counts[i], percent: pct[i] }))
    .filter((b) => b.count > 0)
    .sort((a, b) => b.count - a.count)
  return { total, ready: total >= PATTERN_MIN, bars }
}

/** Bubble wrap: a sheet of bubbles, popped or not. */
export const BUBBLE_COUNT = 42

export function freshSheet(): boolean[] {
  return Array<boolean>(BUBBLE_COUNT).fill(false)
}

/** Pops one bubble; a popped bubble stays popped. */
export function pop(sheet: boolean[], i: number): boolean[] {
  return sheet.map((p, j) => (j === i ? true : p))
}

export const poppedCount = (sheet: boolean[]): number => sheet.filter(Boolean).length
export const sheetDone = (sheet: boolean[]): boolean => sheet.length > 0 && sheet.every(Boolean)

/** The swap that says to move: carries sources and mentions walking, stairs or exercise. */
export function moveSwap(needs: QuitNeed[] | null): QuitSwap | null {
  if (!needs) return null
  for (const n of needs) {
    for (const s of n.swaps) {
      if (s.refs.length > 0 && /walk|stairs|exercise|run/i.test(s.text)) return s
    }
  }
  return null
}

export interface Card {
  id: string
  text: string
  swap: QuitSwap | null
}

/** One deck: the plain responses first, then the swaps; the same sentence is never twice. */
export function buildDeck(responses: QuitResponse[] | null, needs: QuitNeed[] | null): Card[] {
  const cards: Card[] = []
  const key = (s: string) => s.trim().toLowerCase()
  for (const r of responses ?? []) {
    if (cards.some((c) => key(c.text) === key(r.text))) continue
    cards.push({ id: r.id, text: r.text, swap: null })
  }
  for (const n of needs ?? []) {
    for (const s of n.swaps) {
      const at = cards.findIndex((c) => key(c.text) === key(s.text))
      if (at >= 0) {
        // a response that is also a checked swap gains its evidence
        if (!cards[at].swap) cards[at] = { ...cards[at], swap: s }
        continue
      }
      cards.push({ id: s.id, text: s.text, swap: s })
    }
  }
  return cards
}

/** Next and previous card, wrapping. */
export const nextCard = (i: number, size: number): number => (size <= 0 ? 0 : (i + 1) % size)
export const prevCard = (i: number, size: number): number => (size <= 0 ? 0 : (i - 1 + size) % size)
/** Where the deck starts for a picked situation (its place in the list). */
export const startCard = (momentIndex: number, size: number): number => (size <= 0 ? 0 : momentIndex % size)
