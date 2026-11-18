import type { QuitLesson } from "../../../types"
import { DAY, keyToMs } from "../../progress/shared/calc"

/** First lesson day; days before it (up to weeks early) still show this lesson. */
export const FIRST_DAY = -3
export const WORDS_PER_MIN = 200

/**
 * His day number from the quit date: the quit date is day 1, the day before it is day -1
 * (there is no day 0); anything earlier than three days before clamps to -3.
 */
export function dayNumber(todayKey: string, startKey: string): number {
  const diff = Math.round((keyToMs(todayKey) - keyToMs(startKey)) / DAY)
  if (diff >= 0) return diff + 1
  return Math.max(diff, FIRST_DAY)
}

/** Lessons in day order. */
export const sortLessons = (lessons: QuitLesson[]) => [...lessons].sort((a, b) => a.day - b.day)

/**
 * The lesson for a day number. Exact match first; day 0 (no lesson) and days before the first
 * take the nearest earlier-or-first lesson; days after the last lesson have none.
 */
export function lessonFor(lessons: QuitLesson[], day: number): QuitLesson | null {
  const sorted = sortLessons(lessons)
  if (sorted.length === 0) return null
  const exact = sorted.find((l) => l.day === day)
  if (exact) return exact
  if (day > sorted[sorted.length - 1].day) return null
  const before = sorted.filter((l) => l.day < day)
  return before.length > 0 ? before[before.length - 1] : sorted[0]
}

/** The lesson after this one in day order, or null. */
export function nextLesson(lessons: QuitLesson[], day: number): QuitLesson | null {
  return sortLessons(lessons).find((l) => l.day > day) ?? null
}

/** Whole minutes to read a text at 200 words a minute, rounded up, at least 1. */
export function readMinutes(text: string): number {
  const words = text.split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.ceil(words / WORDS_PER_MIN))
}

/* ---------- stored state ---------- */

export interface DoneMark {
  at: number
  note: string
}
export type DoneMap = Record<string, DoneMark>

const isObj = (x: unknown): x is Record<string, unknown> => !!x && typeof x === "object" && !Array.isArray(x)

export function parseDone(x: unknown): DoneMap {
  const out: DoneMap = {}
  if (!isObj(x)) return out
  for (const [k, v] of Object.entries(x)) {
    if (!/^-?\d+$/.test(k) || !isObj(v)) continue
    out[k] = { at: typeof v.at === "number" ? v.at : 0, note: typeof v.note === "string" ? v.note : "" }
  }
  return out
}

export const markDone = (done: DoneMap, day: number, note: string, at: number): DoneMap => ({ ...done, [String(day)]: { at, note: note.trim() } })
export const isDone = (done: DoneMap, day: number) => String(day) in done

export type Thumb = "more" | "less"
export type ThumbMap = Record<string, Thumb>

export function parseThumbs(x: unknown): ThumbMap {
  const out: ThumbMap = {}
  if (!isObj(x)) return out
  for (const [k, v] of Object.entries(x)) if (/^-?\d+$/.test(k) && (v === "more" || v === "less")) out[k] = v
  return out
}

/** Tapping the chosen thumb again clears it. */
export function setThumb(map: ThumbMap, day: number, thumb: Thumb): ThumbMap {
  const next = { ...map }
  if (next[String(day)] === thumb) delete next[String(day)]
  else next[String(day)] = thumb
  return next
}

export function parseDays(x: unknown): number[] {
  return Array.isArray(x) ? x.filter((n): n is number => Number.isInteger(n)) : []
}

export const validTime = (x: unknown): x is string => typeof x === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(x)

/** A day number typed in the lab control, or null when not a whole number in range. */
export function parseDayInput(raw: string): number | null {
  if (!/^-?\d{1,3}$/.test(raw.trim())) return null
  const n = Number(raw)
  return n >= FIRST_DAY && n <= 365 ? n : null
}
