import type { QuitLesson } from "../../types"
import { isObj } from "../common"

/** First lesson day: three days before day 1. There is no day 0. */
export const FIRST_DAY = -3
export const MAX_NOTE = 1000

function dayNum(iso: string): number {
  return Math.round(new Date(`${iso}T00:00:00Z`).getTime() / 86_400_000)
}

/** Whole days from `a` to `b` (both ISO days); positive when `b` is later. */
export function daysBetween(a: string, b: string): number {
  return dayNum(b) - dayNum(a)
}

/** The ISO day `n` days after `day`. */
export function shift(day: string, n: number): string {
  return new Date((dayNum(day) + n) * 86_400_000).toISOString().slice(0, 10)
}

/** His day number: the start day is day 1, the day before it is day −1 (no day 0). */
export function dayFrom(start: string, today: string): number {
  const d = daysBetween(start, today)
  return d >= 0 ? d + 1 : d
}

export interface PlaceInput {
  today: string
  /** Start day of the living Black Box run, or null. */
  runStart: string | null
  quitDate: string | null
  goal: "stop" | "break" | "later" | null
  /** Day of the latest slip in the Black Box, or null. */
  lastSlip: string | null
  /** The last lesson day (14). */
  lastDay: number
}

export type Place =
  | { kind: "day"; day: number }
  | { kind: "early"; startsOn: string; daysToGo: number }
  | { kind: "none"; reason: "nodate" }
  | { kind: "none"; reason: "slip"; slipDay: string }
  | { kind: "end"; day: number }

/** Where he is in the lessons, read from the living run, else the quit date. */
export function placeFor(p: PlaceInput): Place {
  const fromStart = (start: string): Place => {
    const day = dayFrom(start, p.today)
    if (day > p.lastDay) return { kind: "end", day }
    if (day < FIRST_DAY) return { kind: "early", startsOn: shift(start, FIRST_DAY), daysToGo: daysBetween(p.today, start) }
    return { kind: "day", day }
  }
  if (p.runStart) return fromStart(p.runStart)
  const slipped = (since: string | null) => p.lastSlip !== null && (since === null || p.lastSlip >= since)
  if (p.quitDate && p.goal !== "later") {
    if (p.quitDate > p.today) return fromStart(p.quitDate)
    if (slipped(p.quitDate)) return { kind: "none", reason: "slip", slipDay: p.lastSlip as string }
    return fromStart(p.quitDate)
  }
  if (p.lastSlip !== null) return { kind: "none", reason: "slip", slipDay: p.lastSlip }
  return { kind: "none", reason: "nodate" }
}

/** The title without a leading "Day 5: " (the day is shown beside it), first letter upper case. */
export function shownTitle(title: string): string {
  const t = title.replace(/^Day\s*[−-]?\d+:\s*/, "")
  return t.charAt(0).toUpperCase() + t.slice(1)
}

/** True when the lesson body already holds the proof's sentence (same words, ignoring case, quotes and punctuation). */
export function proofRepeats(body: string, proof: string): boolean {
  const norm = (x: string) => x.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim()
  const p = norm(proof)
  return p.length > 0 && norm(body).includes(p.slice(0, Math.min(p.length, 80)))
}

/** Lessons in day order. */
export const sortLessons = (lessons: QuitLesson[]) => [...lessons].sort((a, b) => a.day - b.day)

/** The lesson of one day, or null. */
export const lessonOn = (lessons: QuitLesson[], day: number) => lessons.find((l) => l.day === day) ?? null

/** The lesson after / before this one in day order, or null. */
export const nextLesson = (lessons: QuitLesson[], day: number) => sortLessons(lessons).find((l) => l.day > day) ?? null
export function prevLesson(lessons: QuitLesson[], day: number): QuitLesson | null {
  const before = sortLessons(lessons).filter((l) => l.day < day)
  return before.length > 0 ? before[before.length - 1] : null
}

/** A lesson is usable when it has the fields the screen shows. */
export function validLesson(l: unknown): l is QuitLesson {
  const x = l as Partial<QuitLesson> | null
  return !!x && Number.isInteger(x.day) && x.day !== 0 && typeof x.title === "string" && typeof x.body === "string" && typeof x.exercise === "string"
}

/* ---------- saved state ---------- */

export interface LessonState {
  /** Lesson day → when it was marked done (ms). */
  done: Record<string, number>
  /** Lesson day → his note, saved as he types. */
  notes: Record<string, string>
}

export const EMPTY_LESSON: LessonState = { done: {}, notes: {} }

const DAY_KEY = /^-?\d{1,3}$/

export function parseLessonState(raw: unknown): LessonState {
  if (!isObj(raw)) return EMPTY_LESSON
  const done: Record<string, number> = {}
  const notes: Record<string, string> = {}
  if (isObj(raw.done)) for (const [k, v] of Object.entries(raw.done)) if (DAY_KEY.test(k) && typeof v === "number" && Number.isFinite(v)) done[k] = v
  if (isObj(raw.notes)) for (const [k, v] of Object.entries(raw.notes)) if (DAY_KEY.test(k) && typeof v === "string") notes[k] = v.slice(0, MAX_NOTE)
  return { done, notes }
}

export const isDone = (s: LessonState, day: number) => String(day) in s.done

export function setDone(s: LessonState, day: number, on: boolean, at: number): LessonState {
  const done = { ...s.done }
  if (on) done[String(day)] = at
  else delete done[String(day)]
  return { ...s, done }
}

export function setNote(s: LessonState, day: number, text: string): LessonState {
  const notes = { ...s.notes }
  const t = text.slice(0, MAX_NOTE)
  if (t === "") delete notes[String(day)]
  else notes[String(day)] = t
  return { ...s, notes }
}

/** How many of these lesson days are marked done. */
export const doneCount = (s: LessonState, lessons: QuitLesson[]) => lessons.filter((l) => isDone(s, l.day)).length

/** `?day=N` from the address, only when that lesson exists. */
export function parseDayParam(raw: string | null, lessons: QuitLesson[]): number | null {
  if (raw === null || !DAY_KEY.test(raw)) return null
  const n = Number(raw)
  return lessons.some((l) => l.day === n) ? n : null
}
